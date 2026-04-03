"""
Prediction Engine v2 — upgraded algorithm.

Improvements over v1:
  1. Venue-specific form  — home team uses HOME-only form, away team uses AWAY-only form.
  2. Recency weighting    — exponential decay (λ=0.75): most recent game counts most.
  3. Poisson distribution — industry-standard goal model (Opta / Betfair style).
  4. Bookmaker prior      — if fixture has odds, blends market-implied probs (30%)
                           with the model (70%). Market odds already price in injuries,
                           lineup news, and travel fatigue we cannot otherwise see.
  5. Accuracy tracking    — get_engine_accuracy_stats() reads DB history to show
                           how each confidence tier is actually performing.

Architecture:
  - NEVER calls any external API. All data comes from fixtures already in the DB.
  - Predictions are generated once per day and stored — endpoints serve stored data.
"""

import math
import logging
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.models import Fixture, Prediction
from app.core.database import SessionLocal
from app.services.calibration_service import (
    load_calibration,
    compute_calibrated_thresholds,
    compute_market_multipliers,
)
from app.services.logistic_regression_service import load_model_weights

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tuneable constants
# ---------------------------------------------------------------------------

DECAY         = 0.75   # Exponential recency factor: game[i] weight = DECAY^i
VENUE_GAMES   = 8      # Home-only / away-only form window
H2H_GAMES     = 15     # Head-to-head history window
MARKET_WEIGHT = 0.30   # Bookmaker blend weight (30% market, 70% model)
MODEL_WEIGHT  = 0.70

DEFAULT_HOME_GOALS = 1.45  # Fallback league averages when DB has no data
DEFAULT_AWAY_GOALS = 1.10


# ---------------------------------------------------------------------------
# DB helpers — venue-specific fixture queries
# ---------------------------------------------------------------------------

def _home_fixtures(db: Session, team_id: int, n: int = VENUE_GAMES) -> list:
    """Last N finished fixtures where this team played at HOME."""
    return (
        db.query(Fixture)
        .filter(Fixture.status == "finished", Fixture.home_team_id == team_id)
        .order_by(Fixture.kickoff.desc())
        .limit(n)
        .all()
    )


def _away_fixtures(db: Session, team_id: int, n: int = VENUE_GAMES) -> list:
    """Last N finished fixtures where this team played AWAY."""
    return (
        db.query(Fixture)
        .filter(Fixture.status == "finished", Fixture.away_team_id == team_id)
        .order_by(Fixture.kickoff.desc())
        .limit(n)
        .all()
    )


def _h2h_fixtures(db: Session, home_id: int, away_id: int, n: int = H2H_GAMES) -> list:
    """Last N finished H2H fixtures between two teams (either direction)."""
    return (
        db.query(Fixture)
        .filter(
            Fixture.status == "finished",
            or_(
                and_(Fixture.home_team_id == home_id, Fixture.away_team_id == away_id),
                and_(Fixture.home_team_id == away_id, Fixture.away_team_id == home_id),
            ),
        )
        .order_by(Fixture.kickoff.desc())
        .limit(n)
        .all()
    )


# ---------------------------------------------------------------------------
# Improvement 1 & 2: Venue-specific form with recency weighting
# ---------------------------------------------------------------------------

def _weighted_form(fixtures: list, is_home_team: bool) -> float:
    """
    Form score in [0, 1] with exponential recency decay.

    is_home_team=True  → fixtures are home games for this team
    is_home_team=False → fixtures are away games for this team

    Weight of game i = DECAY^i (i=0 is most recent).
    Falls back to 0.5 (neutral) when no history exists.
    """
    if not fixtures:
        return 0.5

    weighted_pts = 0.0
    weighted_max = 0.0

    for i, f in enumerate(fixtures):
        weight = DECAY ** i
        h = f.home_score or 0
        a = f.away_score or 0

        if is_home_team:
            pts = 3 if h > a else (1 if h == a else 0)
        else:
            pts = 3 if a > h else (1 if h == a else 0)

        weighted_pts += weight * pts
        weighted_max += weight * 3

    return weighted_pts / weighted_max if weighted_max > 0 else 0.5


# ---------------------------------------------------------------------------
# Recency-weighted goal rates (venue-specific)
# ---------------------------------------------------------------------------

def _goal_rates(fixtures: list, is_home_team: bool) -> tuple[float, float]:
    """
    Returns (avg_scored, avg_conceded) using recency weighting.

    is_home_team=True  → fixtures are this team's HOME games
    is_home_team=False → fixtures are this team's AWAY games
    """
    if not fixtures:
        return 1.3, 1.1

    scored = conceded = weight_total = 0.0
    for i, f in enumerate(fixtures):
        w = DECAY ** i
        h = f.home_score or 0
        a = f.away_score or 0
        if is_home_team:
            scored   += w * h
            conceded += w * a
        else:
            scored   += w * a
            conceded += w * h
        weight_total += w

    if weight_total == 0:
        return 1.3, 1.1
    return scored / weight_total, conceded / weight_total


# ---------------------------------------------------------------------------
# League goal averages — normalisation baseline for Poisson
# ---------------------------------------------------------------------------

def _league_averages(db: Session, league_id: int) -> tuple[float, float]:
    """
    League average home goals and away goals from the last 200 finished
    fixtures. Falls back to global defaults when the league has no history.
    """
    rows = (
        db.query(Fixture.home_score, Fixture.away_score)
        .filter(
            Fixture.league_id == league_id,
            Fixture.status == "finished",
            Fixture.home_score.isnot(None),
        )
        .order_by(Fixture.kickoff.desc())
        .limit(200)
        .all()
    )
    if not rows:
        return DEFAULT_HOME_GOALS, DEFAULT_AWAY_GOALS

    home_avg = sum(r.home_score for r in rows) / len(rows)
    away_avg = sum(r.away_score for r in rows) / len(rows)
    return home_avg, away_avg


# ---------------------------------------------------------------------------
# H2H advantage (recency-weighted)
# ---------------------------------------------------------------------------

def _h2h_advantage(fixtures: list, home_id: int, away_id: int) -> float:
    """
    Returns H2H advantage in [-1, 1]:
    +1 = home team historically dominates, -1 = away team dominates.
    Recency-weighted — recent H2H meetings count more.
    """
    if not fixtures:
        return 0.0

    home_w = away_w = 0.0
    for i, f in enumerate(fixtures):
        weight = DECAY ** i
        h = f.home_score or 0
        a = f.away_score or 0
        if h > a:
            if f.home_team_id == home_id:
                home_w += weight
            else:
                away_w += weight
        elif a > h:
            if f.away_team_id == away_id:
                away_w += weight
            else:
                home_w += weight

    total = home_w + away_w
    return (home_w - away_w) / total if total > 0 else 0.0


# ---------------------------------------------------------------------------
# Improvement 3: Poisson distribution goal model
# ---------------------------------------------------------------------------

def _poisson_pmf(k: int, lam: float) -> float:
    """P(X = k) for a Poisson(λ) random variable."""
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(-lam) * (lam ** k) / math.factorial(k)


def _poisson_probs(home_xg: float, away_xg: float, max_goals: int = 7) -> dict:
    """
    Build a joint goal probability matrix and return:
      - home_win / draw / away_win: match outcome probabilities
      - over25: P(total goals > 2.5)
      - btts:   P(home scores ≥ 1 AND away scores ≥ 1)
    """
    home_pmf = [_poisson_pmf(k, home_xg) for k in range(max_goals + 1)]
    away_pmf = [_poisson_pmf(k, away_xg) for k in range(max_goals + 1)]

    home_win = draw = away_win = over25 = btts = 0.0

    for h in range(max_goals + 1):
        for a in range(max_goals + 1):
            p = home_pmf[h] * away_pmf[a]
            if h > a:
                home_win += p
            elif h == a:
                draw += p
            else:
                away_win += p
            if h + a > 2:
                over25 += p
            if h > 0 and a > 0:
                btts += p

    return {
        "home_win": home_win,
        "draw":     draw,
        "away_win": away_win,
        "over25":   over25,
        "btts":     btts,
    }


# ---------------------------------------------------------------------------
# Improvement 4: Bookmaker odds → fair implied probabilities
# ---------------------------------------------------------------------------

def _market_probs(home_odds, draw_odds, away_odds) -> dict | None:
    """
    Convert bookmaker decimal odds to fair implied probabilities by
    normalising out the vig (overround). Returns None if odds are missing.
    """
    if not all([home_odds, draw_odds, away_odds]):
        return None
    if min(home_odds, draw_odds, away_odds) <= 1.0:
        return None

    raw_home = 1.0 / home_odds
    raw_draw = 1.0 / draw_odds
    raw_away = 1.0 / away_odds
    total    = raw_home + raw_draw + raw_away

    return {
        "home": raw_home / total,
        "draw": raw_draw / total,
        "away": raw_away / total,
    }


# ---------------------------------------------------------------------------
# Strength model — form + H2H (blended with Poisson)
# ---------------------------------------------------------------------------

def _strength_model(
    home_form: float,
    away_form: float,
    h2h_adv: float,
    league_home_avg: float,
    league_away_avg: float,
    form_weight:     float = 0.55,
    h2h_weight:      float = 0.30,
    home_adv_weight: float = 0.15,
) -> tuple[float, float, float]:
    """
    Returns (home_win_prob, draw_prob, away_win_prob) from a form+H2H
    strength model.

    Default weighting (overridden by fitted model weights when available):
      55% venue-specific recency-weighted form
      30% H2H historical advantage
      15% dynamic home-field advantage (derived from league scoring ratio)
    """
    ha_ratio  = league_home_avg / max(league_away_avg, 0.5)
    ha_boost  = min(0.15, max(0.03, (ha_ratio - 1) * 0.1 + 0.08))

    home_str  = home_form * form_weight + (h2h_adv + 1) / 2 * h2h_weight + ha_boost * home_adv_weight
    away_str  = away_form * form_weight + (1 - (h2h_adv + 1) / 2) * h2h_weight
    draw_str  = 0.22  # draw has a baseline "pull"

    total = home_str + away_str + draw_str
    return home_str / total, draw_str / total, away_str / total


# ---------------------------------------------------------------------------
# Final assembly — blend all signals
# ---------------------------------------------------------------------------

def _assemble(
    home_form:          float,
    away_form:          float,
    h2h_adv:            float,
    home_attack:        float,
    home_concede:       float,
    away_attack:        float,
    away_concede:       float,
    league_home_avg:    float,
    league_away_avg:    float,
    market:             dict | None,
    calibrated_thresholds: dict | None = None,
    market_multipliers:    dict | None = None,
    model_weights:         dict | None = None,
) -> dict:
    """
    Combines:
      - Poisson goal model (default 50%)
      - Form + H2H strength model (default 50%)
      - Blends with bookmaker market odds if available (30% market / 70% model)
      - Applies calibrated confidence thresholds (Level 1) when available
      - Applies per-market accuracy multipliers (Level 2) when available
      - Applies LR-fitted mixing weights (Priority 2) when available
    """

    # Expected goals using Dixon-Coles-style attack × defence / league normalisation
    home_xg = (home_attack / max(league_home_avg, 0.5)) * \
              (away_concede  / max(league_away_avg, 0.5)) * league_home_avg
    away_xg = (away_attack  / max(league_away_avg, 0.5)) * \
              (home_concede  / max(league_home_avg, 0.5)) * league_away_avg

    home_xg = max(0.2, min(5.0, home_xg))
    away_xg = max(0.2, min(5.0, away_xg))

    poisson  = _poisson_probs(home_xg, away_xg)

    # Use LR-fitted weights when available, fall back to defaults
    poisson_w  = model_weights["poisson_weight"]  if model_weights else 0.50
    strength_w = model_weights["strength_weight"] if model_weights else 0.50
    fw         = model_weights["form_weight"]      if model_weights else 0.55
    hw         = model_weights["h2h_weight"]       if model_weights else 0.30
    haw        = model_weights["home_adv_weight"]  if model_weights else 0.15

    strength = _strength_model(
        home_form, away_form, h2h_adv,
        league_home_avg, league_away_avg,
        form_weight=fw, h2h_weight=hw, home_adv_weight=haw,
    )

    blend_home = poisson["home_win"] * poisson_w + strength[0] * strength_w
    blend_draw = poisson["draw"]     * poisson_w + strength[1] * strength_w
    blend_away = poisson["away_win"] * poisson_w + strength[2] * strength_w

    # Normalise
    total = blend_home + blend_draw + blend_away
    blend_home /= total
    blend_draw /= total
    blend_away /= total

    # Blend with market odds (Bayesian prior) when available
    market_used = market is not None
    if market_used:
        blend_home = MODEL_WEIGHT * blend_home + MARKET_WEIGHT * market["home"]
        blend_draw = MODEL_WEIGHT * blend_draw + MARKET_WEIGHT * market["draw"]
        blend_away = MODEL_WEIGHT * blend_away + MARKET_WEIGHT * market["away"]
        total = blend_home + blend_draw + blend_away
        blend_home /= total
        blend_draw /= total
        blend_away /= total

    home_win_pct = round(max(5.0, min(92.0, blend_home * 100)), 1)
    draw_pct     = round(max(5.0, min(45.0, blend_draw  * 100)), 1)
    away_win_pct = round(max(5.0, min(92.0, blend_away  * 100)), 1)
    over25_pct   = round(max(20.0, min(88.0, poisson["over25"] * 100)), 1)
    btts_pct     = round(max(15.0, min(85.0, poisson["btts"]   * 100)), 1)

    picks    = {"1": home_win_pct, "X": draw_pct, "2": away_win_pct,
                "over25": over25_pct, "btts": btts_pct}
    best_pick = max(picks, key=lambda k: picks[k])
    best_pct  = picks[best_pick]

    # ---------------------------------------------------------------------------
    # Level 2 — Market-type accuracy weighting
    # Apply a per-market multiplier derived from historical hit rates so that
    # markets that consistently underperform (e.g. draws) don't get falsely
    # elevated confidence labels.
    # ---------------------------------------------------------------------------
    effective_pct = best_pct
    if market_multipliers:
        multiplier = market_multipliers.get(best_pick, 1.0)
        effective_pct = best_pct * multiplier

    # ---------------------------------------------------------------------------
    # Level 1 — Calibrated confidence thresholds
    # Use adjusted thresholds when calibration data is available; fall back to
    # the original hardcoded values for fresh deploys with no history yet.
    # ---------------------------------------------------------------------------
    thresholds = calibrated_thresholds or {
        "high_confidence": 72.0,
        "high":            62.0,
        "medium":          50.0,
    }

    if effective_pct >= thresholds["high_confidence"]:
        confidence = "high_confidence"
    elif effective_pct >= thresholds["high"]:
        confidence = "high"
    elif effective_pct >= thresholds["medium"]:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "home_win_pct": home_win_pct,
        "draw_pct":     draw_pct,
        "away_win_pct": away_win_pct,
        "over25_pct":   over25_pct,
        "btts_pct":     btts_pct,
        "best_pick":    best_pick,
        "confidence":   confidence,
        "home_xg":      round(home_xg, 2),
        "away_xg":      round(away_xg, 2),
        "market_blended": market_used,
    }


# ---------------------------------------------------------------------------
# Improvement 5: Accuracy stats from historical DB data
# ---------------------------------------------------------------------------

def get_engine_accuracy_stats(db: Session) -> dict:
    """
    Read every settled prediction from the DB and return hit rates per
    confidence tier. Used by the admin panel to monitor engine quality.
    """
    rows = db.query(Prediction).filter(Prediction.actual_result.isnot(None)).all()

    if not rows:
        return {"total_settled": 0, "overall_accuracy": None, "by_tier": {}}

    buckets: dict = {}
    for pred in rows:
        tier = pred.confidence
        if tier not in buckets:
            buckets[tier] = {"total": 0, "correct": 0}
        buckets[tier]["total"] += 1
        if pred.is_correct:
            buckets[tier]["correct"] += 1

    total   = sum(v["total"]   for v in buckets.values())
    correct = sum(v["correct"] for v in buckets.values())

    return {
        "total_settled":    total,
        "overall_accuracy": round(correct / total * 100, 1) if total else None,
        "by_tier": {
            tier: {
                "total":    v["total"],
                "correct":  v["correct"],
                "hit_rate": round(v["correct"] / v["total"] * 100, 1) if v["total"] else None,
            }
            for tier, v in sorted(buckets.items())
        },
    }


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def generate_prediction(
    home_team_id: int,
    away_team_id: int,
    league_id:    int,
    season:       int,
    db:           Session | None = None,
    fixture:      object | None  = None,
) -> dict:
    """
    Full prediction pipeline for a single fixture.

    Parameters
    ----------
    home_team_id / away_team_id : team IDs
    league_id                   : used for league goal-average normalisation
    season                      : kept for API compatibility (not used internally)
    db                          : SQLAlchemy session (one is created/closed if None)
    fixture                     : Fixture ORM object — supplies bookmaker odds for
                                  the market-blending step. Recommended but optional.

    Returns a dict with keys matching the Prediction model columns.
    """
    _owns_session = db is None
    if _owns_session:
        db = SessionLocal()

    try:
        # --- Venue-specific fixture history ---
        home_home = _home_fixtures(db, home_team_id)   # home team's recent HOME games
        home_away = _away_fixtures(db, home_team_id)   # home team's AWAY games (for goal rate pool)
        away_away = _away_fixtures(db, away_team_id)   # away team's recent AWAY games
        away_home = _home_fixtures(db, away_team_id)   # away team's HOME games (for goal rate pool)
        h2h       = _h2h_fixtures(db, home_team_id, away_team_id)

        # --- Venue-specific form (core improvement) ---
        home_form = _weighted_form(home_home, is_home_team=True)
        away_form = _weighted_form(away_away, is_home_team=False)
        h2h_adv   = _h2h_advantage(h2h, home_team_id, away_team_id)

        # --- Goal rates from venue-matched fixtures ---
        home_attack, home_concede = _goal_rates(home_home, is_home_team=True)
        away_attack, away_concede = _goal_rates(away_away, is_home_team=False)

        # Supplement thin venue data with cross-venue if < 3 games recorded
        if len(home_home) < 3 and home_away:
            ha_attack, ha_concede = _goal_rates(home_away, is_home_team=False)
            home_attack = (home_attack + ha_attack) / 2
            home_concede = (home_concede + ha_concede) / 2

        if len(away_away) < 3 and away_home:
            ah_attack, ah_concede = _goal_rates(away_home, is_home_team=True)
            away_attack = (away_attack + ah_attack) / 2
            away_concede = (away_concede + ah_concede) / 2

        # --- League normalisation baseline ---
        league_home_avg, league_away_avg = _league_averages(db, league_id)

        # --- Bookmaker odds as Bayesian prior ---
        market = None
        if fixture is not None:
            market = _market_probs(
                getattr(fixture, "home_odds", None),
                getattr(fixture, "draw_odds", None),
                getattr(fixture, "away_odds", None),
            )

        # --- Load calibration data (Level 1 + Level 2) ---
        # Falls back gracefully to hardcoded defaults if no calibration exists yet.
        calibration           = load_calibration(db)
        calibrated_thresholds = compute_calibrated_thresholds(calibration.get("tier", {}))
        market_multipliers    = compute_market_multipliers(calibration.get("market", {}))

        # --- Load LR-fitted model weights (Priority 2) ---
        # Returns None until 300 settled predictions are available.
        model_weights = load_model_weights(db)

        result = _assemble(
            home_form=home_form,
            away_form=away_form,
            h2h_adv=h2h_adv,
            home_attack=home_attack,
            home_concede=home_concede,
            away_attack=away_attack,
            away_concede=away_concede,
            league_home_avg=league_home_avg,
            league_away_avg=league_away_avg,
            market=market,
            calibrated_thresholds=calibrated_thresholds,
            market_multipliers=market_multipliers,
            model_weights=model_weights,
        )

        # Store v3 feature columns so the LR trainer can use them later
        result["home_form_score"] = round(home_form, 4)
        result["away_form_score"] = round(away_form, 4)
        result["h2h_adv_score"]   = round(h2h_adv,   4)

        return result

    finally:
        if _owns_session:
            db.close()

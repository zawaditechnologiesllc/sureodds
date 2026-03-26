"""
Prediction Engine — calculates match probabilities from data already in the DB.

Architecture:
  - NEVER calls any external API. All form and goal data comes from
    fixtures already fetched and stored by the scheduler.
  - Predictions are generated once per day (06:00 UTC) and stored.
  - Endpoints serve stored predictions — never recalculate per request.

Algorithm:
  - Home/away form: last 5 finished matches, W=3pts D=1pt L=0pts
  - Goal averages: mean goals scored/conceded over last 5 games
  - Home advantage: +5% baseline boost applied to home win probability
  - H2H: derived from DB history between the two teams (last 10 matches)
  - Confidence tagging: "high_confidence" if best probability ≥ 70%
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy import cast, Date, or_, and_
from app.models.models import Fixture
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# DB-based form helpers
# ---------------------------------------------------------------------------

def get_team_last_n_fixtures(
    db: Session, team_id: int, n: int = 5
) -> list[Fixture]:
    """Return the last N finished fixtures for a team (home or away)."""
    return (
        db.query(Fixture)
        .filter(
            Fixture.status == "finished",
            or_(
                Fixture.home_team_id == team_id,
                Fixture.away_team_id == team_id,
            ),
        )
        .order_by(Fixture.kickoff.desc())
        .limit(n)
        .all()
    )


def get_h2h_fixtures(
    db: Session, home_team_id: int, away_team_id: int, n: int = 10
) -> list[Fixture]:
    """Return last N finished H2H fixtures between two teams (either direction)."""
    return (
        db.query(Fixture)
        .filter(
            Fixture.status == "finished",
            or_(
                and_(
                    Fixture.home_team_id == home_team_id,
                    Fixture.away_team_id == away_team_id,
                ),
                and_(
                    Fixture.home_team_id == away_team_id,
                    Fixture.away_team_id == home_team_id,
                ),
            ),
        )
        .order_by(Fixture.kickoff.desc())
        .limit(n)
        .all()
    )


# ---------------------------------------------------------------------------
# Metric calculations
# ---------------------------------------------------------------------------

def calculate_form_score(fixtures: list[Fixture], team_id: int) -> float:
    """
    Returns form score in [0, 1]:
      3 pts for a win, 1 for draw, 0 for loss — normalised over max points.
    Falls back to 0.5 when no history exists.
    """
    if not fixtures:
        return 0.5

    points = 0
    max_pts = len(fixtures) * 3

    for f in fixtures:
        h_score = f.home_score or 0
        a_score = f.away_score or 0
        is_home = f.home_team_id == team_id

        if is_home:
            if h_score > a_score:
                points += 3
            elif h_score == a_score:
                points += 1
        else:
            if a_score > h_score:
                points += 3
            elif h_score == a_score:
                points += 1

    return points / max_pts if max_pts > 0 else 0.5


def calculate_goal_averages(fixtures: list[Fixture], team_id: int) -> tuple[float, float]:
    """
    Returns (avg_scored, avg_conceded) over the provided fixtures.
    Falls back to (1.2, 1.2) — league averages — when there is no history.
    """
    if not fixtures:
        return 1.2, 1.2

    scored = 0.0
    conceded = 0.0

    for f in fixtures:
        h_score = f.home_score or 0
        a_score = f.away_score or 0
        if f.home_team_id == team_id:
            scored   += h_score
            conceded += a_score
        else:
            scored   += a_score
            conceded += h_score

    n = len(fixtures)
    return scored / n, conceded / n


def calculate_h2h_advantage(
    h2h_fixtures: list[Fixture], home_team_id: int, away_team_id: int
) -> float:
    """
    Returns H2H advantage in [-1, 1]:
      +1 = home team dominates, -1 = away team dominates, 0 = even.
    """
    if not h2h_fixtures:
        return 0.0

    home_wins = 0
    away_wins = 0

    for f in h2h_fixtures:
        h_score = f.home_score or 0
        a_score = f.away_score or 0
        if h_score > a_score:
            if f.home_team_id == home_team_id:
                home_wins += 1
            else:
                away_wins += 1
        elif a_score > h_score:
            if f.away_team_id == away_team_id:
                away_wins += 1
            else:
                home_wins += 1

    total = home_wins + away_wins
    if total == 0:
        return 0.0
    return (home_wins - away_wins) / total


# ---------------------------------------------------------------------------
# Probability computation
# ---------------------------------------------------------------------------

def compute_probabilities(
    home_form: float,
    away_form: float,
    h2h_advantage: float,
    home_goals_avg: float,
    away_goals_avg: float,
    home_concede_avg: float,
    away_concede_avg: float,
    home_advantage: float = 0.05,
) -> dict:
    """
    Combine form, H2H, and goal averages into final probabilities.

    Weighting:
      60% form score, 30% H2H history, 10% home-field advantage.
    Goals: expected goals model for Over 2.5 and BTTS.
    """
    home_strength = (
        home_form * 0.6
        + (h2h_advantage + 1) / 2 * 0.3
        + home_advantage * 0.1
    )
    away_strength = (
        away_form * 0.6
        + (1 - (h2h_advantage + 1) / 2) * 0.3
    )

    total = home_strength + away_strength + 0.25
    home_win_pct = round((home_strength / total) * 100, 1)
    away_win_pct = round((away_strength / total) * 100, 1)
    draw_pct     = round(100 - home_win_pct - away_win_pct, 1)

    # Expected goals: attack of one team vs defence of the other
    home_xg = (home_goals_avg + away_concede_avg) / 2
    away_xg = (away_goals_avg + home_concede_avg) / 2
    total_xg = home_xg + away_xg

    over25_pct = round(min(85, max(20, (total_xg / 2.5) * 55)), 1)
    btts_pct   = round(min(80, max(20, min(home_xg, away_xg) * 60)), 1)

    # Clamp all values
    home_win_pct = max(5, min(90, home_win_pct))
    draw_pct     = max(5, min(50, draw_pct))
    away_win_pct = max(5, min(90, away_win_pct))

    picks = {
        "1":      home_win_pct,
        "X":      draw_pct,
        "2":      away_win_pct,
        "over25": over25_pct,
        "btts":   btts_pct,
    }
    best_pick = max(picks, key=lambda k: picks[k])
    best_pct  = picks[best_pick]
    best_prob = best_pct / 100.0

    if best_prob >= 0.70:
        confidence = "high_confidence"
    elif best_pct >= 65:
        confidence = "high"
    elif best_pct >= 50:
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
    }


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def generate_prediction(
    home_team_id: int,
    away_team_id: int,
    league_id: int,
    season: int,
    db: Session | None = None,
) -> dict:
    """
    Full prediction pipeline for a single fixture.
    Uses DB history only — no external API calls.
    A new DB session is opened and closed internally if one is not supplied.
    """
    _owns_session = db is None
    if _owns_session:
        db = SessionLocal()

    try:
        home_fixtures = get_team_last_n_fixtures(db, home_team_id, n=5)
        away_fixtures = get_team_last_n_fixtures(db, away_team_id, n=5)
        h2h_fixtures  = get_h2h_fixtures(db, home_team_id, away_team_id, n=10)

        home_form = calculate_form_score(home_fixtures, home_team_id)
        away_form = calculate_form_score(away_fixtures, away_team_id)
        h2h_adv   = calculate_h2h_advantage(h2h_fixtures, home_team_id, away_team_id)

        home_scored,   home_conceded = calculate_goal_averages(home_fixtures, home_team_id)
        away_scored,   away_conceded = calculate_goal_averages(away_fixtures, away_team_id)

        return compute_probabilities(
            home_form=home_form,
            away_form=away_form,
            h2h_advantage=h2h_adv,
            home_goals_avg=home_scored,
            away_goals_avg=away_scored,
            home_concede_avg=home_conceded,
            away_concede_avg=away_conceded,
        )

    finally:
        if _owns_session:
            db.close()

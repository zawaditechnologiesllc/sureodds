"""
Model Calibration Service — Levels 1 & 2.

Runs automatically after every results reconciliation batch. Requires a
minimum number of settled predictions before doing anything useful.

Level 1 — Confidence threshold calibration (Platt scaling lite):
  The engine currently uses fixed thresholds (≥72% → high_confidence, etc.).
  This service computes the real hit rate per tier and shifts the thresholds
  so the labels become truthful. If "high_confidence" picks are only landing
  58% of the time, the threshold moves up until the label earns its name.

Level 2 — Market-type accuracy weighting:
  Draws ("X") are notoriously hard to predict. If the engine's draw picks
  only hit 22% while over25 hits 68%, a raw-probability draw should be
  penalised before the confidence label is assigned. This service stores
  per-market hit rates; the prediction engine uses them as multipliers.

Output:
  Writes rows into the model_calibration table (two types: "tier", "market").
  The prediction engine reads these at prediction-generation time.
"""

import logging
from sqlalchemy.orm import Session
from app.models.models import ModelCalibration, Prediction

logger = logging.getLogger(__name__)

MIN_TOTAL_SAMPLES  = 30   # skip calibration if fewer settled predictions exist
MIN_BUCKET_SAMPLES = 10   # skip a specific bucket if sample is too small


def run_calibration(db: Session) -> dict:
    """
    Compute and persist calibration data from all settled predictions.

    Returns a summary dict for logging.
    """
    rows = (
        db.query(Prediction)
        .filter(Prediction.actual_result.isnot(None))
        .all()
    )

    total = len(rows)
    if total < MIN_TOTAL_SAMPLES:
        logger.info(
            f"Calibration: only {total} settled predictions "
            f"(need {MIN_TOTAL_SAMPLES}). Skipping."
        )
        return {"skipped": True, "total_settled": total}

    tier_buckets:   dict[str, dict] = {}
    market_buckets: dict[str, dict] = {}

    for pred in rows:
        tier   = pred.confidence
        market = pred.best_pick

        tier_buckets.setdefault(tier,   {"total": 0, "correct": 0})
        market_buckets.setdefault(market, {"total": 0, "correct": 0})

        tier_buckets[tier]["total"]     += 1
        market_buckets[market]["total"] += 1

        if pred.is_correct:
            tier_buckets[tier]["correct"]     += 1
            market_buckets[market]["correct"] += 1

    db.query(ModelCalibration).delete()

    tier_results   = {}
    market_results = {}

    for tier, data in tier_buckets.items():
        if data["total"] < MIN_BUCKET_SAMPLES:
            continue
        hit_rate = data["correct"] / data["total"]
        db.add(ModelCalibration(
            calibration_type="tier",
            key=tier,
            hit_rate=round(hit_rate, 4),
            sample_size=data["total"],
        ))
        tier_results[tier] = round(hit_rate * 100, 1)

    for market, data in market_buckets.items():
        if data["total"] < MIN_BUCKET_SAMPLES:
            continue
        hit_rate = data["correct"] / data["total"]
        db.add(ModelCalibration(
            calibration_type="market",
            key=market,
            hit_rate=round(hit_rate, 4),
            sample_size=data["total"],
        ))
        market_results[market] = round(hit_rate * 100, 1)

    db.commit()
    logger.info(
        f"Calibration complete — {total} settled predictions. "
        f"Tier hit rates: {tier_results}. "
        f"Market hit rates: {market_results}."
    )
    return {
        "skipped":        False,
        "total_settled":  total,
        "tier_hit_rates": tier_results,
        "market_hit_rates": market_results,
    }


def load_calibration(db: Session) -> dict:
    """
    Load calibration data from the DB for use by the prediction engine.

    Returns:
      {
        "tier":   {"high_confidence": 0.63, "high": 0.55, ...},
        "market": {"1": 0.61, "X": 0.24, "2": 0.58, "over25": 0.67, "btts": 0.59},
      }
    Returns empty dicts when no calibration data exists yet.
    """
    rows = db.query(ModelCalibration).all()
    result: dict = {"tier": {}, "market": {}}
    for row in rows:
        result[row.calibration_type][row.key] = row.hit_rate
    return result


def compute_calibrated_thresholds(tier_hit_rates: dict[str, float]) -> dict[str, float]:
    """
    Derive adjusted confidence thresholds from actual tier hit rates.

    Default (uncalibrated) thresholds:
      high_confidence : ≥ 72%
      high            : ≥ 62%
      medium          : ≥ 50%
      low             : < 50%

    Target (desired) hit rates — what the label should mean:
      high_confidence : 70%  (label should only appear when engine is ≥70% accurate)
      high            : 60%
      medium          : 50%

    Adjustment rule:
      For each tier, threshold_shift = (target_rate - actual_rate) * 100
      Capped at ±12 percentage points to avoid overcorrection on small samples.

    Example: if high_confidence predictions actually land 56% of the time
    (target 70%), shift = (0.70 - 0.56) * 100 = 14 → capped → +12pp.
    New threshold = 72 + 12 = 84%.  Engine only calls something
    "high_confidence" when the raw probability is ≥ 84%, making the label
    truthful again.
    """
    BASE_THRESHOLDS = {
        "high_confidence": 72.0,
        "high":            62.0,
        "medium":          50.0,
    }
    TARGET_RATES = {
        "high_confidence": 0.70,
        "high":            0.60,
        "medium":          0.50,
    }
    MAX_SHIFT = 12.0

    adjusted = {}
    for tier, base in BASE_THRESHOLDS.items():
        actual = tier_hit_rates.get(tier)
        if actual is None:
            adjusted[tier] = base
            continue
        target = TARGET_RATES[tier]
        shift  = (target - actual) * 100
        shift  = max(-MAX_SHIFT, min(MAX_SHIFT, shift))
        adjusted[tier] = round(base + shift, 1)

    return adjusted


def compute_market_multipliers(market_hit_rates: dict[str, float]) -> dict[str, float]:
    """
    Derive per-market multipliers from actual hit rates.

    If all markets hit at the global average rate the multiplier is 1.0.
    Markets that consistently underperform get a multiplier < 1 so that
    their effective probability (raw_prob * multiplier) is lower before the
    confidence tier is assigned.

    Example: if draws ("X") hit 22% and the global average is 52%:
      multiplier = 0.22 / 0.52 = 0.42
      A draw predicted at 65% raw probability has effective prob 27%,
      which falls below even the "medium" threshold — so it won't be
      labelled as a high-confidence draw pick when the engine's historical
      draw accuracy doesn't support that label.

    Multipliers are soft-capped at [0.40, 1.20] to prevent extreme swings.
    """
    if not market_hit_rates:
        return {}

    global_avg = sum(market_hit_rates.values()) / len(market_hit_rates)
    if global_avg <= 0:
        return {}

    multipliers = {}
    for market, rate in market_hit_rates.items():
        raw = rate / global_avg
        multipliers[market] = round(max(0.40, min(1.20, raw)), 4)
    return multipliers

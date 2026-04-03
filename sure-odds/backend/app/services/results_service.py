"""
Service for reconciling match results and scoring predictions.

Data is NOT fetched here — the scheduler fetches and stores it via
fixtures_service.fetch_window(). This module simply reads finished
matches from the DB and marks prediction outcomes.

No external API calls are made.
Results are reconciled for a 7-day rolling window, matching the
7-day display window shown to users on the results page.
"""

import logging
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import cast, Date
from app.models.models import Fixture, Prediction
from app.services.calibration_service import run_calibration

logger = logging.getLogger(__name__)

# Results are shown and reconciled for a 7-day rolling window.
RESULTS_WINDOW_DAYS = 7


def determine_actual_result(home_score: int, away_score: int) -> str:
    if home_score > away_score:
        return "1"
    if home_score == away_score:
        return "X"
    return "2"


def check_prediction_correct(
    prediction: Prediction, actual: str, home_score: int, away_score: int
) -> bool:
    best = prediction.best_pick
    if best in ("1", "X", "2"):
        return best == actual
    if best == "over25":
        return (home_score + away_score) > 2.5
    if best == "btts":
        return home_score > 0 and away_score > 0
    return False


def reconcile_results(db: Session, days_back: int = RESULTS_WINDOW_DAYS) -> dict:
    """
    Read finished fixtures from the DB for the past N days and
    mark prediction outcomes (is_correct, actual_result).

    Covers today as well (matches that finished today are included via <=).
    No API calls — data was stored during the last scheduled fetch.
    """
    updated = 0
    correct = 0
    today = date.today()

    finished_fixtures = (
        db.query(Fixture)
        .filter(
            cast(Fixture.kickoff, Date) >= today - timedelta(days=days_back),
            cast(Fixture.kickoff, Date) <= today,  # include today's finished matches
            Fixture.status == "finished",
        )
        .all()
    )

    for fixture in finished_fixtures:
        if fixture.home_score is None or fixture.away_score is None:
            continue

        actual = determine_actual_result(fixture.home_score, fixture.away_score)

        prediction = (
            db.query(Prediction)
            .filter(Prediction.fixture_id == fixture.id)
            .first()
        )

        if prediction and prediction.actual_result is None:
            is_correct = check_prediction_correct(
                prediction, actual, fixture.home_score, fixture.away_score
            )
            prediction.actual_result = actual
            prediction.is_correct = is_correct
            updated += 1
            if is_correct:
                correct += 1

    db.commit()
    accuracy = round((correct / updated * 100), 1) if updated > 0 else 0
    logger.info(
        f"Results reconcile: {updated} updated, {correct} correct, {accuracy}% accuracy"
    )

    # Run calibration after every reconciliation batch so the prediction
    # engine's confidence thresholds and market multipliers stay current.
    calibration_result = run_calibration(db)
    if not calibration_result.get("skipped"):
        logger.info(f"Calibration updated: {calibration_result}")

    return {"updated": updated, "correct": correct, "accuracy_pct": accuracy}


# Keep backward-compatible async wrapper so existing callers don't break
async def update_results(db: Session, days_back: int = RESULTS_WINDOW_DAYS) -> dict:
    return reconcile_results(db, days_back=days_back)

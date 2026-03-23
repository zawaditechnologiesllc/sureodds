"""
Service for updating match results and verifying predictions.
"""

from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.models.models import Fixture, Prediction
from app.services.fixtures_service import fetch_fixtures_for_date, map_status, ACTIVE_LEAGUES


def determine_actual_result(home_score: int, away_score: int) -> str:
    if home_score > away_score:
        return "1"
    if home_score == away_score:
        return "X"
    return "2"


def check_prediction_correct(prediction: Prediction, actual: str, home_score: int, away_score: int) -> bool:
    best = prediction.best_pick
    if best in ("1", "X", "2"):
        return best == actual
    if best == "over25":
        return (home_score + away_score) > 2.5
    if best == "btts":
        return home_score > 0 and away_score > 0
    return False


async def update_results(db: Session) -> dict:
    yesterday = date.today() - timedelta(days=1)
    updated = 0
    correct = 0

    for league in ACTIVE_LEAGUES:
        fixtures_data = await fetch_fixtures_for_date(yesterday, league["id"])
        for f in fixtures_data:
            fixture_id = f["fixture"]["id"]
            status = map_status(f["fixture"]["status"]["short"])

            if status != "finished":
                continue

            home_score = f["goals"]["home"] or 0
            away_score = f["goals"]["away"] or 0
            actual = determine_actual_result(home_score, away_score)

            fixture = db.query(Fixture).filter(Fixture.id == fixture_id).first()
            if not fixture:
                continue

            fixture.status = "finished"
            fixture.home_score = home_score
            fixture.away_score = away_score

            prediction = db.query(Prediction).filter(Prediction.fixture_id == fixture_id).first()
            if prediction and prediction.actual_result is None:
                is_correct = check_prediction_correct(prediction, actual, home_score, away_score)
                prediction.actual_result = actual
                prediction.is_correct = is_correct
                updated += 1
                if is_correct:
                    correct += 1

    db.commit()
    accuracy = round((correct / updated * 100), 1) if updated > 0 else 0
    return {"updated": updated, "correct": correct, "accuracy_pct": accuracy}

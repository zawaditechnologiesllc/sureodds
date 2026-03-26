from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import date, timedelta
from typing import List
from app.core.database import get_db
from app.models.models import User, Fixture, Prediction
from app.services.fixtures_service import (
    update_all_fixtures,
    fetch_upcoming,
    fetch_results,
    get_api_status,
    get_current_season,
    get_daily_request_count,
    MAX_DAILY_REQUESTS,
)
from app.services.results_service import update_results
from app.services.prediction_engine import generate_prediction
from app.core.config import settings
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])


def verify_admin(x_admin_key: str = Header(None)):
    if settings.ENVIRONMENT == "development":
        return
    if x_admin_key != settings.SECRET_KEY:
        raise HTTPException(status_code=403, detail="Not authorized")


class UserAdminOut(BaseModel):
    id: str
    email: str
    isPaid: bool
    createdAt: str

    class Config:
        from_attributes = True


@router.get("/users", dependencies=[Depends(verify_admin)])
async def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).limit(100).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "isPaid": u.subscription_status == "paid",
            "createdAt": u.created_at.isoformat() if u.created_at else "",
            "referralCode": u.referral_code,
        }
        for u in users
    ]


@router.get("/predictions", dependencies=[Depends(verify_admin)])
async def list_predictions(db: Session = Depends(get_db)):
    preds = (
        db.query(Prediction, Fixture)
        .join(Fixture, Prediction.fixture_id == Fixture.id)
        .order_by(Fixture.kickoff.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": p.id,
            "fixture": f"{fix.home_team_name} vs {fix.away_team_name}",
            "kickoff": fix.kickoff.isoformat(),
            "bestPick": p.best_pick,
            "confidence": p.confidence,
            "isCorrect": p.is_correct,
        }
        for p, fix in preds
    ]


@router.get("/stats", dependencies=[Depends(verify_admin)])
async def get_stats(db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    paid_users = db.query(User).filter(User.subscription_status == "paid").count()
    today = date.today()
    today_predictions = (
        db.query(Prediction)
        .join(Fixture, Prediction.fixture_id == Fixture.id)
        .filter(cast(Fixture.kickoff, Date) == today)
        .count()
    )
    total_fixtures = db.query(Fixture).count()
    today_fixtures = (
        db.query(Fixture)
        .filter(cast(Fixture.kickoff, Date) == today)
        .count()
    )
    return {
        "total_users": total_users,
        "paid_users": paid_users,
        "free_users": total_users - paid_users,
        "today_predictions": today_predictions,
        "total_fixtures": total_fixtures,
        "today_fixtures": today_fixtures,
        "api_key_configured": bool(
            settings.FOOTBALL_DATA_API_KEY or settings.API_FOOTBALL_KEY
        ),
        "environment": settings.ENVIRONMENT,
        "current_season": get_current_season(),
        "data_source": "football-data.org",
    }


@router.get("/api-status", dependencies=[Depends(verify_admin)])
async def admin_api_status():
    """
    Check Football-Data.org API status: key configured, daily call budget,
    and current season. No live API call is made — reads from the in-memory
    daily counter only.
    """
    status = await get_api_status()
    return {
        "season": get_current_season(),
        "api_key_set": bool(
            settings.FOOTBALL_DATA_API_KEY or settings.API_FOOTBALL_KEY
        ),
        **status,
    }


# /admin/run-update — full fixture refresh (past 5 days + today + next 3 days)
@router.post("/run-update", dependencies=[Depends(verify_admin)])
async def trigger_run_update(db: Session = Depends(get_db)):
    """Manually trigger a full fixture fetch (2 API calls)."""
    result = await update_all_fixtures(db)
    return {"success": True, **result}


@router.post("/update-fixtures", dependencies=[Depends(verify_admin)])
async def trigger_update_fixtures(db: Session = Depends(get_db)):
    result = await update_all_fixtures(db)
    return {"success": True, **result}


# /admin/run-predictions — generate predictions for today and next 3 days
@router.post("/run-predictions", dependencies=[Depends(verify_admin)])
async def trigger_run_predictions(db: Session = Depends(get_db)):
    today = date.today()
    upcoming_dates = [today + timedelta(days=i) for i in range(4)]

    fixtures = (
        db.query(Fixture)
        .filter(
            cast(Fixture.kickoff, Date).in_(upcoming_dates),
            Fixture.status == "scheduled",
        )
        .filter(~Fixture.id.in_(db.query(Prediction.fixture_id)))
        .all()
    )

    created = 0
    for fixture in fixtures:
        try:
            probabilities = await generate_prediction(
                fixture.home_team_id,
                fixture.away_team_id,
                fixture.league_id,
                fixture.season,
                db=db,
            )
            prediction = Prediction(fixture_id=fixture.id, **probabilities)
            db.add(prediction)
            created += 1
        except Exception:
            continue

    db.commit()
    return {"success": True, "predictions_created": created}


# /admin/run-results — reconcile results from DB (no API call)
@router.post("/run-results", dependencies=[Depends(verify_admin)])
async def trigger_run_results(db: Session = Depends(get_db)):
    """Reconcile prediction outcomes against finished matches in the DB."""
    result = await update_results(db)
    return {"success": True, **result}


@router.post("/update-results", dependencies=[Depends(verify_admin)])
async def trigger_update_results(db: Session = Depends(get_db)):
    result = await update_results(db)
    return {"success": True, **result}

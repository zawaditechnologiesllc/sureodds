"""
Pick packages — available credit bundles users can purchase.
"""
import logging
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.core.database import get_db
from app.models.models import Package, UserPackage, UserVipAccess, Fixture, Prediction, League
from app.routers.users import get_current_user, User
from sqlalchemy import cast, Date
from datetime import date

logger = logging.getLogger(__name__)

router = APIRouter(tags=["packages"])


class PackageOut(BaseModel):
    id: int
    name: str
    price: float
    picks_count: int
    currency: str
    package_type: str = "credits"
    duration_days: Optional[int] = None
    description: Optional[str] = None
    features: Optional[str] = None

    class Config:
        from_attributes = True


class CreditsOut(BaseModel):
    remaining_picks: int
    expires_at: Optional[str] = None


class UnlockRequest(BaseModel):
    fixture_id: int


@router.get("/packages", response_model=List[PackageOut])
async def list_packages(db: Session = Depends(get_db)):
    """Return all available pick (credits) packages only."""
    packages = (
        db.query(Package)
        .filter(Package.is_active == True, Package.package_type == "credits")
        .order_by(Package.price)
        .all()
    )
    return packages


@router.get("/packages/vip", response_model=List[PackageOut])
async def list_vip_packages(db: Session = Depends(get_db)):
    """Return all available VIP access packages."""
    packages = (
        db.query(Package)
        .filter(Package.is_active == True, Package.package_type == "vip")
        .order_by(Package.price)
        .all()
    )
    return packages


@router.get("/vip-status")
async def get_vip_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the authenticated user's active VIP access (if any)."""
    access = (
        db.query(UserVipAccess)
        .filter(
            UserVipAccess.user_id == current_user.id,
            UserVipAccess.expires_at > datetime.utcnow(),
        )
        .order_by(UserVipAccess.expires_at.desc())
        .first()
    )
    if not access:
        return {"is_active": False, "expires_at": None, "package_name": None}

    pkg = db.query(Package).filter(Package.id == access.package_id).first()
    return {
        "is_active": True,
        "expires_at": access.expires_at.isoformat(),
        "package_name": pkg.name if pkg else "VIP Access",
        "duration_days": pkg.duration_days if pkg else None,
    }


@router.get("/user-credits", response_model=CreditsOut)
async def get_user_credits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the authenticated user's remaining pick credits."""
    pkg = db.query(UserPackage).filter(UserPackage.user_id == current_user.id).first()
    if not pkg:
        return CreditsOut(remaining_picks=0)

    # Check expiry
    if pkg.expires_at and pkg.expires_at < datetime.utcnow():
        pkg.remaining_picks = 0
        db.commit()

    return CreditsOut(
        remaining_picks=pkg.remaining_picks,
        expires_at=pkg.expires_at.isoformat() if pkg.expires_at else None,
    )


@router.get("/high-confidence-picks")
async def get_high_confidence_picks(db: Session = Depends(get_db)):
    """
    Return today's high_confidence predictions (metadata only — no full details without unlock).
    """
    today = date.today()
    rows = (
        db.query(Fixture, League, Prediction)
        .join(League, Fixture.league_id == League.id)
        .join(Prediction, Prediction.fixture_id == Fixture.id)
        .filter(cast(Fixture.kickoff, Date) == today)
        .filter(Fixture.status.in_(["scheduled", "live"]))
        .filter(Prediction.confidence == "high_confidence")
        .order_by(Fixture.kickoff)
        .all()
    )

    return [
        {
            "fixtureId": fixture.id,
            "homeTeam": fixture.home_team_name,
            "awayTeam": fixture.away_team_name,
            "league": league.name,
            "kickoff": fixture.kickoff.isoformat(),
            "confidence": "high_confidence",
            "locked": True,
            "message": "🔒 High Confidence Pick — Unlock with 1 Credit",
        }
        for fixture, league, pred in rows
    ]


@router.post("/unlock-pick")
async def unlock_pick(
    body: UnlockRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Unlock a single prediction pick by consuming 1 credit.
    Returns full prediction details after decrementing remaining_picks.
    """
    # Check credits
    pkg = db.query(UserPackage).filter(UserPackage.user_id == current_user.id).first()

    # Subscription users get unlimited access
    if current_user.subscription_status != "paid":
        if not pkg or pkg.remaining_picks <= 0:
            raise HTTPException(status_code=402, detail="No credits available. Purchase a pick package to continue.")

        # Consume 1 credit
        pkg.remaining_picks -= 1
        db.commit()

    # Fetch and return the full prediction
    row = (
        db.query(Fixture, League, Prediction)
        .join(League, Fixture.league_id == League.id)
        .join(Prediction, Prediction.fixture_id == Fixture.id)
        .filter(Fixture.id == body.fixture_id)
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Prediction not found for this fixture")

    fixture, league, pred = row
    remaining = pkg.remaining_picks if pkg else None

    return {
        "fixtureId": fixture.id,
        "homeTeam": {"id": fixture.home_team_id, "name": fixture.home_team_name, "logo": fixture.home_team_logo},
        "awayTeam": {"id": fixture.away_team_id, "name": fixture.away_team_name, "logo": fixture.away_team_logo},
        "league": league.name,
        "kickoff": fixture.kickoff.isoformat(),
        "homeWinPct": pred.home_win_pct,
        "drawPct": pred.draw_pct,
        "awayWinPct": pred.away_win_pct,
        "over25Pct": pred.over25_pct,
        "bttsPct": pred.btts_pct,
        "bestPick": pred.best_pick,
        "confidence": pred.confidence,
        "creditsRemaining": remaining,
        "unlocked": True,
    }

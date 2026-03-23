from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import User, ReferralEarning
from app.routers.users import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/referrals", tags=["referrals"])


class ReferralStatsOut(BaseModel):
    referralCode: str
    referralLink: str
    clicks: int
    signups: int
    earnings: float
    pendingPayouts: float


@router.get("/stats", response_model=ReferralStatsOut)
async def get_referral_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    signups = db.query(func.count(User.id)).filter(User.referred_by == current_user.id).scalar() or 0

    total_earnings = (
        db.query(func.sum(ReferralEarning.amount))
        .filter(ReferralEarning.user_id == current_user.id, ReferralEarning.status == "paid")
        .scalar() or 0
    )

    pending = (
        db.query(func.sum(ReferralEarning.amount))
        .filter(ReferralEarning.user_id == current_user.id, ReferralEarning.status == "pending")
        .scalar() or 0
    )

    return ReferralStatsOut(
        referralCode=current_user.referral_code,
        referralLink=f"https://sureodds.app?ref={current_user.referral_code}",
        clicks=0,  # Track via analytics (e.g. Plausible / Vercel Analytics)
        signups=signups,
        earnings=float(total_earnings),
        pendingPayouts=float(pending),
    )

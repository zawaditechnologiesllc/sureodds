"""
Partner dashboard API — protected routes for approved affiliate partners.
"""
import hashlib
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.models import (
    PartnerApplication,
    PartnerPayoutSettings,
    ReferralClick,
    ReferralEarning,
    Transaction,
    User,
)
from app.routers.users import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/partner-dashboard", tags=["partner-dashboard"])


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _require_approved_partner(current_user: User, db: Session) -> PartnerApplication:
    """Raise 403 if the user is not an approved partner."""
    app = (
        db.query(PartnerApplication)
        .filter(
            PartnerApplication.user_id == current_user.id,
            PartnerApplication.status == "approved",
        )
        .first()
    )
    if not app:
        raise HTTPException(
            status_code=403,
            detail="Access denied — approved partner account required.",
        )
    return app


# ──────────────────────────────────────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────────────────────────────────────

class PartnerStatusOut(BaseModel):
    isPartner: bool
    name: Optional[str] = None
    email: str
    referralCode: str
    referralLink: str
    joinedAt: Optional[str] = None


class ReferralDetail(BaseModel):
    email: str
    joinedAt: str
    hasPurchased: bool
    totalSpent: float
    commissionEarned: float


class PartnerStatsOut(BaseModel):
    totalClicks: int
    totalSignups: int
    conversionRate: float
    totalSales: float
    totalCommission: float
    pendingCommission: float
    paidCommission: float
    referrals: List[ReferralDetail]


class PayoutSettingsIn(BaseModel):
    method: str                         # "usdt" | "bank"
    usdt_address: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_swift: Optional[str] = None
    bank_country: Optional[str] = None


class PayoutSettingsOut(BaseModel):
    method: str
    usdt_address: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_swift: Optional[str] = None
    bank_country: Optional[str] = None
    updatedAt: Optional[str] = None


class TrackClickIn(BaseModel):
    referral_code: str


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/status", response_model=PartnerStatusOut)
async def get_partner_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check whether the authenticated user is an approved partner."""
    app = (
        db.query(PartnerApplication)
        .filter(
            PartnerApplication.user_id == current_user.id,
            PartnerApplication.status == "approved",
        )
        .first()
    )
    return PartnerStatusOut(
        isPartner=app is not None,
        name=app.name if app else None,
        email=current_user.email,
        referralCode=current_user.referral_code,
        referralLink=f"https://sureodds.pro/invite?code={current_user.referral_code}",
        joinedAt=app.reviewed_at.isoformat() if app and app.reviewed_at else None,
    )


@router.get("/stats", response_model=PartnerStatsOut)
async def get_partner_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Full partner analytics — requires approved partner status."""
    _require_approved_partner(current_user, db)

    # Click tracking
    total_clicks = (
        db.query(func.count(ReferralClick.id))
        .filter(ReferralClick.referral_code == current_user.referral_code)
        .scalar() or 0
    )

    # Signups (users who used this referral code)
    referred_users = (
        db.query(User).filter(User.referred_by == current_user.id).all()
    )
    total_signups = len(referred_users)
    conversion_rate = round((total_signups / total_clicks * 100), 1) if total_clicks > 0 else 0.0

    # Earnings breakdown
    total_commission = (
        db.query(func.sum(ReferralEarning.amount))
        .filter(ReferralEarning.user_id == current_user.id)
        .scalar() or 0.0
    )
    paid_commission = (
        db.query(func.sum(ReferralEarning.amount))
        .filter(
            ReferralEarning.user_id == current_user.id,
            ReferralEarning.status == "paid",
        )
        .scalar() or 0.0
    )
    pending_commission = float(total_commission) - float(paid_commission)

    # Total sales driven (sum of purchases by referred users)
    referred_ids = [u.id for u in referred_users]
    total_sales = 0.0
    if referred_ids:
        total_sales = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.user_id.in_(referred_ids),
                Transaction.status == "success",
            )
            .scalar() or 0.0
        )

    # Build per-referral detail
    referral_details: List[ReferralDetail] = []
    for u in referred_users:
        spent = (
            db.query(func.sum(Transaction.amount))
            .filter(Transaction.user_id == u.id, Transaction.status == "success")
            .scalar() or 0.0
        )
        earned = (
            db.query(func.sum(ReferralEarning.amount))
            .filter(
                ReferralEarning.user_id == current_user.id,
                ReferralEarning.referred_user_id == u.id,
            )
            .scalar() or 0.0
        )
        referral_details.append(
            ReferralDetail(
                email=u.email,
                joinedAt=u.created_at.isoformat() if u.created_at else "",
                hasPurchased=float(spent) > 0,
                totalSpent=float(spent),
                commissionEarned=float(earned),
            )
        )

    return PartnerStatsOut(
        totalClicks=total_clicks,
        totalSignups=total_signups,
        conversionRate=conversion_rate,
        totalSales=float(total_sales),
        totalCommission=float(total_commission),
        pendingCommission=pending_commission,
        paidCommission=float(paid_commission),
        referrals=referral_details,
    )


@router.get("/payout-settings", response_model=Optional[PayoutSettingsOut])
async def get_payout_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the partner's current payout settings."""
    _require_approved_partner(current_user, db)
    ps = (
        db.query(PartnerPayoutSettings)
        .filter(PartnerPayoutSettings.user_id == current_user.id)
        .first()
    )
    if not ps:
        return None
    return PayoutSettingsOut(
        method=ps.method,
        usdt_address=ps.usdt_address,
        bank_name=ps.bank_name,
        bank_account_number=ps.bank_account_number,
        bank_account_name=ps.bank_account_name,
        bank_swift=ps.bank_swift,
        bank_country=ps.bank_country,
        updatedAt=ps.updated_at.isoformat() if ps.updated_at else (ps.created_at.isoformat() if ps.created_at else None),
    )


@router.post("/payout-settings", response_model=PayoutSettingsOut)
async def save_payout_settings(
    body: PayoutSettingsIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update payout settings for the partner."""
    _require_approved_partner(current_user, db)

    if body.method == "usdt" and not body.usdt_address:
        raise HTTPException(status_code=422, detail="USDT TRC-20 address is required.")
    if body.method == "bank" and not (body.bank_account_number and body.bank_name):
        raise HTTPException(status_code=422, detail="Bank name and account number are required.")

    ps = (
        db.query(PartnerPayoutSettings)
        .filter(PartnerPayoutSettings.user_id == current_user.id)
        .first()
    )
    if ps:
        ps.method = body.method
        ps.usdt_address = body.usdt_address
        ps.bank_name = body.bank_name
        ps.bank_account_number = body.bank_account_number
        ps.bank_account_name = body.bank_account_name
        ps.bank_swift = body.bank_swift
        ps.bank_country = body.bank_country
        ps.updated_at = datetime.utcnow()
    else:
        ps = PartnerPayoutSettings(
            user_id=current_user.id,
            method=body.method,
            usdt_address=body.usdt_address,
            bank_name=body.bank_name,
            bank_account_number=body.bank_account_number,
            bank_account_name=body.bank_account_name,
            bank_swift=body.bank_swift,
            bank_country=body.bank_country,
        )
        db.add(ps)

    db.commit()
    db.refresh(ps)

    return PayoutSettingsOut(
        method=ps.method,
        usdt_address=ps.usdt_address,
        bank_name=ps.bank_name,
        bank_account_number=ps.bank_account_number,
        bank_account_name=ps.bank_account_name,
        bank_swift=ps.bank_swift,
        bank_country=ps.bank_country,
        updatedAt=ps.updated_at.isoformat() if ps.updated_at else None,
    )


@router.post("/track-click")
async def track_referral_click(
    body: TrackClickIn,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Record a click on a referral link.
    Called from the /invite page when it loads with ?code=...
    Rate-limited by IP hash — one click per IP per referral code per day.
    """
    # Verify the referral code belongs to someone
    referrer = db.query(User).filter(User.referral_code == body.referral_code).first()
    if not referrer:
        raise HTTPException(status_code=404, detail="Referral code not found.")

    # Hash the IP so we store no PII
    client_ip = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()[:16]

    # Deduplicate: one click per IP per referral per day
    from datetime import date
    today_start = datetime.combine(date.today(), datetime.min.time())
    existing = (
        db.query(ReferralClick)
        .filter(
            ReferralClick.referral_code == body.referral_code,
            ReferralClick.ip_hash == ip_hash,
            ReferralClick.created_at >= today_start,
        )
        .first()
    )
    if not existing:
        db.add(ReferralClick(referral_code=body.referral_code, ip_hash=ip_hash))
        db.commit()

    return {"ok": True}

import logging
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User, PartnerApplication, Notification
from app.core.config import settings
from pydantic import BaseModel
import secrets
import string
from threading import Thread

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

_supabase_client = None


def get_supabase_client():
    global _supabase_client
    if _supabase_client is None:
        from supabase import create_client
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_client


def generate_referral_code(length=8) -> str:
    chars = string.ascii_uppercase + string.digits
    return "SURE-" + "".join(secrets.choice(chars) for _ in range(length))


async def optional_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    """Like get_current_user but returns None instead of 401 when unauthenticated."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return await get_current_user(authorization=authorization, db=db)
    except HTTPException:
        return None


async def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = authorization.split(" ")[1]
    try:
        supabase = get_supabase_client()
        user_response = supabase.auth.get_user(token)
        supabase_user = user_response.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    if not supabase_user:
        raise HTTPException(status_code=401, detail="User not found")

    db_user = db.query(User).filter(User.id == supabase_user.id).first()
    if not db_user:
        ref_code = generate_referral_code()
        ref_by = supabase_user.user_metadata.get("ref_code") if supabase_user.user_metadata else None
        referrer = None
        if ref_by:
            referrer = db.query(User).filter(User.referral_code == ref_by).first()

        db_user = User(
            id=supabase_user.id,
            email=supabase_user.email,
            referral_code=ref_code,
            referred_by=referrer.id if referrer else None,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        # Notify partner via email if this user was referred
        if referrer:
            _notify_partner_new_signup(referrer, supabase_user.email, db)

    return db_user


def _notify_partner_new_signup(referrer: User, new_email: str, db: Session) -> None:
    """Fire-and-forget email to the referrer's approved partner account (if any)."""
    try:
        from app.core.email import send_partner_signup_notification
        from app.models.models import PartnerApplication as PA
        partner_app = (
            db.query(PA)
            .filter(PA.user_id == referrer.id, PA.status == "approved")
            .first()
        )
        if partner_app:
            Thread(
                target=send_partner_signup_notification,
                args=(referrer.email, partner_app.name, new_email),
                daemon=True,
            ).start()
            logger.info("Partner notification queued for %s", referrer.email)
    except Exception as exc:
        logger.warning("Partner notification error: %s", exc)


class UserOut(BaseModel):
    id: str
    email: str
    isPaid: bool
    referralCode: str
    predictionScore: float
    accuracy: float

    class Config:
        from_attributes = True


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        isPaid=current_user.subscription_status == "paid",
        referralCode=current_user.referral_code,
        predictionScore=current_user.prediction_score or 0,
        accuracy=current_user.accuracy_pct or 0,
    )


@router.get("/notifications")
async def get_my_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return active notifications targeted at this user based on their role."""
    is_partner = (
        db.query(PartnerApplication)
        .filter(
            PartnerApplication.user_id == current_user.id,
            PartnerApplication.status == "approved",
        )
        .first()
        is not None
    )
    role = "partners" if is_partner else "users"
    notifs = (
        db.query(Notification)
        .filter(
            Notification.is_active == True,
            Notification.target.in_(["all", role]),
        )
        .order_by(Notification.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "target": n.target,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]

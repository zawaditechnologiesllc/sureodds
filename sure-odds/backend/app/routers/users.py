from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User
from app.core.config import settings
from supabase import create_client
from pydantic import BaseModel
import secrets
import string

router = APIRouter(prefix="/users", tags=["users"])

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def generate_referral_code(length=8) -> str:
    chars = string.ascii_uppercase + string.digits
    return "SURE-" + "".join(secrets.choice(chars) for _ in range(length))


async def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = authorization.split(" ")[1]
    try:
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

    return db_user


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

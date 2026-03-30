"""
Partner / affiliate program routes.
- Public: POST /partners/apply  — submit a partner application
- Public: GET  /partners/invite/{code} — validate an invite/referral code
- Auth:   GET  /partners/my-stats — alias for referral stats (partner dashboard)
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.models.models import PartnerApplication, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/partners", tags=["partners"])


class PartnerApplicationIn(BaseModel):
    name: str
    email: str
    platform: str
    handle: str
    followers: str
    website: Optional[str] = None
    why: str


class PartnerApplicationOut(BaseModel):
    id: str
    status: str
    submitted_at: str

    class Config:
        from_attributes = True


@router.post("/apply", response_model=PartnerApplicationOut)
def submit_application(body: PartnerApplicationIn, db: Session = Depends(get_db)):
    """Submit a partner program application."""
    existing = (
        db.query(PartnerApplication)
        .filter(PartnerApplication.email == body.email.strip().lower())
        .filter(PartnerApplication.status.in_(["pending", "approved"]))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="An application from this email is already pending or approved."
        )

    app = PartnerApplication(
        name=body.name.strip(),
        email=body.email.strip().lower(),
        platform=body.platform,
        handle=body.handle.strip().lstrip("@"),
        followers=body.followers,
        website=body.website,
        why=body.why.strip(),
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    logger.info(f"New partner application from {app.email} ({app.platform})")

    return PartnerApplicationOut(
        id=app.id,
        status=app.status,
        submitted_at=app.submitted_at.isoformat(),
    )


@router.get("/invite/{code}")
def get_invite_info(code: str, db: Session = Depends(get_db)):
    """
    Validate an invite/referral code and return info about the partner.
    Used by the /invite page to show who is inviting the new user.
    """
    user = db.query(User).filter(User.referral_code == code.upper()).first()
    if not user:
        raise HTTPException(status_code=404, detail="Invite code not found")

    return {
        "valid": True,
        "code": user.referral_code,
        "signup_url": f"https://sureodds.pro/auth/signup?ref={user.referral_code}",
    }

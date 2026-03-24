"""
Paystack payment integration.
Supports subscriptions and pay-as-you-go pick packages.
"""

import httpx
import logging
import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.config import settings
from app.core.database import get_db
from app.models.models import User, Payment, UserPackage
from app.routers.users import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/paystack", tags=["paystack"])

PAYSTACK_BASE = "https://api.paystack.co"

# Plan definitions: name → (amount in kobo/pesewas, picks granted, is_subscription)
PLANS = {
    "subscription": {"amount": 99900, "label": "Monthly Subscription", "picks": 0, "is_sub": True},
    "picks_2":       {"amount": 19900, "label": "2 Premium Picks",      "picks": 2,  "is_sub": False},
    "picks_5":       {"amount": 39900, "label": "5 Premium Picks",      "picks": 5,  "is_sub": False},
    "picks_10":      {"amount": 69900, "label": "10 Premium Picks",     "picks": 10, "is_sub": False},
}


class InitializeRequest(BaseModel):
    plan: str
    callback_url: Optional[str] = None


class VerifyRequest(BaseModel):
    reference: str


def get_paystack_headers():
    if not settings.PAYSTACK_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Payment service not configured")
    return {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }


@router.post("/initialize")
async def initialize_payment(
    body: InitializeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Initialize a Paystack payment transaction."""
    if body.plan not in PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Valid plans: {list(PLANS.keys())}")

    plan_config = PLANS[body.plan]
    reference = f"SO-{secrets.token_hex(8).upper()}"

    payload = {
        "email": current_user.email,
        "amount": plan_config["amount"],
        "reference": reference,
        "currency": "KES",
        "metadata": {
            "user_id": current_user.id,
            "plan": body.plan,
            "picks": plan_config["picks"],
        },
    }

    if body.callback_url:
        payload["callback_url"] = body.callback_url

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{PAYSTACK_BASE}/transaction/initialize",
                headers=get_paystack_headers(),
                json=payload,
                timeout=30,
            )
            data = resp.json()
    except Exception as e:
        logger.error(f"Paystack initialize error: {e}")
        raise HTTPException(status_code=502, detail="Payment gateway error")

    if not data.get("status"):
        raise HTTPException(status_code=400, detail=data.get("message", "Initialization failed"))

    # Store pending payment record
    payment = Payment(
        user_id=current_user.id,
        paystack_reference=reference,
        amount=plan_config["amount"] / 100,
        currency="KES",
        plan=body.plan,
        status="pending",
    )
    db.add(payment)
    db.commit()

    return {
        "authorization_url": data["data"]["authorization_url"],
        "reference": reference,
        "plan": body.plan,
        "label": plan_config["label"],
    }


@router.post("/verify")
async def verify_payment(
    body: VerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify a Paystack transaction and activate subscription or add picks."""
    payment = db.query(Payment).filter(
        Payment.paystack_reference == body.reference,
        Payment.user_id == current_user.id,
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if payment.status == "success":
        return {"status": "already_verified", "plan": payment.plan}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{PAYSTACK_BASE}/transaction/verify/{body.reference}",
                headers=get_paystack_headers(),
                timeout=30,
            )
            data = resp.json()
    except Exception as e:
        logger.error(f"Paystack verify error: {e}")
        raise HTTPException(status_code=502, detail="Payment gateway error")

    if not data.get("status") or data["data"]["status"] != "success":
        payment.status = "failed"
        db.commit()
        raise HTTPException(status_code=400, detail="Payment not successful")

    # Mark payment as verified
    payment.status = "success"
    payment.verified_at = datetime.utcnow()

    plan_config = PLANS.get(payment.plan, {})

    if plan_config.get("is_sub"):
        # Subscription: upgrade user
        current_user.subscription_status = "paid"
        db.commit()
        return {"status": "success", "plan": payment.plan, "subscription": "activated"}
    else:
        # Pay-as-you-go: add picks to user's package
        picks = plan_config.get("picks", 0)
        user_pkg = db.query(UserPackage).filter(UserPackage.user_id == current_user.id).first()
        if user_pkg:
            user_pkg.picks_remaining += picks
            user_pkg.picks_total += picks
        else:
            user_pkg = UserPackage(
                user_id=current_user.id,
                picks_remaining=picks,
                picks_total=picks,
            )
            db.add(user_pkg)

        db.commit()
        return {
            "status": "success",
            "plan": payment.plan,
            "picks_added": picks,
            "picks_remaining": user_pkg.picks_remaining,
        }


@router.get("/plans")
async def list_plans():
    """Return available payment plans."""
    return [
        {
            "id": plan_id,
            "label": cfg["label"],
            "amount": cfg["amount"] / 100,
            "currency": "KES",
            "picks": cfg["picks"],
            "is_subscription": cfg["is_sub"],
        }
        for plan_id, cfg in PLANS.items()
    ]


@router.get("/status")
async def payment_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return current user's subscription and picks status."""
    is_paid = current_user.subscription_status == "paid"
    user_pkg = db.query(UserPackage).filter(UserPackage.user_id == current_user.id).first()
    picks_remaining = user_pkg.picks_remaining if user_pkg else 0

    return {
        "is_paid": is_paid,
        "subscription_status": current_user.subscription_status,
        "picks_remaining": picks_remaining,
        "can_access_premium": is_paid or picks_remaining > 0,
    }

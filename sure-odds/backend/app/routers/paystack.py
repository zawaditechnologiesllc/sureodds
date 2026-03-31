"""
Paystack payment integration — KES currency.
Supports pay-as-you-go pick packages purchased with credits.
"""

import httpx
import logging
import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.config import settings
from app.core.database import get_db
from app.models.models import User, UserPackage, Package, Transaction
from app.routers.users import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/paystack", tags=["paystack"])

PAYSTACK_BASE = "https://api.paystack.co"

# Paystack uses the smallest currency unit.
# For KES: 1 KES = 100 kobo (same convention as NGN/GHS).
CURRENCY = "KES"


class InitializeRequest(BaseModel):
    package_id: int
    email: str
    callback_url: Optional[str] = None


def get_paystack_headers():
    if not settings.paystack_secret_key:
        raise HTTPException(status_code=503, detail="Payment service not configured. Please contact support.")
    return {
        "Authorization": f"Bearer {settings.paystack_secret_key}",
        "Content-Type": "application/json",
    }


@router.post("/initialize")
async def initialize_payment(
    body: InitializeRequest,
    db: Session = Depends(get_db),
):
    """
    Initialize a Paystack payment for a pick package.
    Charges in KES — price field in Package is already in KES.
    """
    package = db.query(Package).filter(Package.id == body.package_id, Package.is_active == True).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    reference = f"SO-{secrets.token_hex(8).upper()}"
    # price is stored in KES; Paystack amount = KES * 100 (smallest unit)
    amount_kobo = int(float(package.price) * 100)

    payload = {
        "email": body.email,
        "amount": amount_kobo,
        "reference": reference,
        "currency": CURRENCY,
        "metadata": {
            "package_id": package.id,
            "package_name": package.name,
            "picks_count": package.picks_count,
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Paystack initialize error: {e}")
        raise HTTPException(status_code=502, detail="Payment gateway unreachable. Please try again.")

    if not data.get("status"):
        raise HTTPException(status_code=400, detail=data.get("message", "Payment initialization failed"))

    # Find user by email and create a pending transaction
    user = db.query(User).filter(User.email == body.email).first()
    if user:
        txn = Transaction(
            user_id=user.id,
            amount=package.price,
            type="package",
            status="pending",
            reference=reference,
            package_id=package.id,
        )
        db.add(txn)
        db.commit()

    return {
        "authorization_url": data["data"]["authorization_url"],
        "reference": reference,
        "package": {
            "id": package.id,
            "name": package.name,
            "price": package.price,
            "currency": CURRENCY,
            "picks_count": package.picks_count,
        },
    }


@router.get("/verify")
async def verify_payment(
    reference: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Verify a Paystack transaction by reference and add credits to the user.
    Called after redirect from Paystack payment page.
    """
    txn = db.query(Transaction).filter(Transaction.reference == reference).first()

    if txn and txn.status == "success":
        return {"status": "already_verified", "reference": reference}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{PAYSTACK_BASE}/transaction/verify/{reference}",
                headers=get_paystack_headers(),
                timeout=30,
            )
            data = resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Paystack verify error: {e}")
        raise HTTPException(status_code=502, detail="Payment gateway unreachable. Please try again.")

    if not data.get("status") or data["data"]["status"] != "success":
        if txn:
            txn.status = "failed"
            db.commit()
        raise HTTPException(status_code=400, detail="Payment not successful or not found")

    tx_data = data["data"]
    meta = tx_data.get("metadata", {})
    package_id = meta.get("package_id")
    picks_count = meta.get("picks_count", 0)
    email = tx_data.get("customer", {}).get("email", "")

    # Find user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found for this payment")

    # Mark transaction success
    if txn:
        txn.status = "success"
        txn.verified_at = datetime.utcnow()
    else:
        txn = Transaction(
            user_id=user.id,
            amount=tx_data.get("amount", 0) / 100,
            type="package",
            status="success",
            reference=reference,
            package_id=package_id,
            verified_at=datetime.utcnow(),
        )
        db.add(txn)

    # Add picks credits to user
    user_pkg = db.query(UserPackage).filter(UserPackage.user_id == user.id).first()
    if user_pkg:
        user_pkg.remaining_picks += picks_count
    else:
        user_pkg = UserPackage(
            user_id=user.id,
            remaining_picks=picks_count,
        )
        db.add(user_pkg)

    db.commit()

    return {
        "status": "success",
        "picks_added": picks_count,
        "picks_remaining": user_pkg.remaining_picks,
        "package_id": package_id,
    }


@router.get("/status")
async def payment_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return current user's subscription and credits status."""
    is_paid = current_user.subscription_status == "paid"
    user_pkg = db.query(UserPackage).filter(UserPackage.user_id == current_user.id).first()
    picks_remaining = user_pkg.remaining_picks if user_pkg else 0

    return {
        "is_paid": is_paid,
        "subscription_status": current_user.subscription_status,
        "picks_remaining": picks_remaining,
        "can_access_premium": is_paid or picks_remaining > 0,
    }

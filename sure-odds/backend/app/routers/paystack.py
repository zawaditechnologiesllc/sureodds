"""
Paystack payment integration.
Prices are stored in USD; the conversion layer multiplies by USD_TO_KES_RATE
so Paystack charges the user in KES (the account's settlement currency).
"""

import httpx
import logging
import secrets
from datetime import datetime
import hashlib
import hmac
import json as json_lib
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.config import settings
from app.core.database import get_db
from app.models.models import User, UserPackage, Package, Transaction, ReferralEarning
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
    Package price is in USD; we convert to KES at the configured rate so that
    Paystack charges the user in KES and settles to the KES account.
    """
    package = db.query(Package).filter(Package.id == body.package_id, Package.is_active == True).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    reference = f"SO-{secrets.token_hex(8).upper()}"
    # USD → KES → Paystack smallest unit (1 KES = 100 kobo)
    amount_kobo = int(float(package.price) * settings.USD_TO_KES_RATE * 100)

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

    # Referral commission — 30% to the partner who referred this user
    if user.referred_by:
        commission = round(float(txn.amount) * settings.PARTNER_COMMISSION_RATE, 2)
        earning = ReferralEarning(
            user_id=user.referred_by,
            referred_user_id=user.id,
            amount=commission,
            subscription_amount=float(txn.amount),
            commission_rate=settings.PARTNER_COMMISSION_RATE,
            status="pending",
        )
        db.add(earning)
        logger.info(f"Commission ${commission} created for referrer {user.referred_by}")

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


# ---------------------------------------------------------------------------
# Mobile Money via Paystack Charge API
# Supports: M-Pesa (mpesa), Airtel Money (airtel)
# ---------------------------------------------------------------------------

class MobileMoneyInitRequest(BaseModel):
    package_id: int
    email: str
    phone: str
    provider: str  # "mpesa" | "airtel"


@router.post("/mobile-money/initialize")
async def initialize_mobile_money(
    body: MobileMoneyInitRequest,
    db: Session = Depends(get_db),
):
    """
    Initialize a Paystack mobile money charge (M-Pesa / Airtel Money).
    Returns a reference for polling. Frontend polls /mobile-money/status to confirm.
    """
    package = db.query(Package).filter(Package.id == body.package_id, Package.is_active == True).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    supported_providers = {"mpesa", "airtel"}
    if body.provider not in supported_providers:
        raise HTTPException(status_code=400, detail=f"Unsupported provider. Choose: {', '.join(supported_providers)}")

    # Normalize phone number to international format (254XXXXXXXXX)
    phone = body.phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+"):
        phone = phone[1:]
    if phone.startswith("07") or phone.startswith("01"):
        phone = "254" + phone[1:]
    elif phone.startswith("7") or phone.startswith("1"):
        phone = "254" + phone
    if not phone.startswith("254") or len(phone) != 12:
        raise HTTPException(status_code=400, detail="Invalid phone number. Use format 07XXXXXXXX or 254XXXXXXXXX")

    reference = f"SO-MM-{secrets.token_hex(8).upper()}"
    amount_kobo = int(float(package.price) * settings.USD_TO_KES_RATE * 100)

    payload = {
        "email": body.email,
        "amount": amount_kobo,
        "currency": CURRENCY,
        "reference": reference,
        "mobile_money": {
            "phone": phone,
            "provider": body.provider,
        },
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{PAYSTACK_BASE}/charge",
                headers=get_paystack_headers(),
                json=payload,
                timeout=30,
            )
            data = resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Paystack mobile money charge error: {e}")
        raise HTTPException(status_code=502, detail="Payment gateway unreachable. Please try again.")

    if not data.get("status"):
        detail = data.get("message", "Mobile money charge failed")
        logger.error(f"Paystack charge error: {data}")
        raise HTTPException(status_code=400, detail=detail)

    # Create pending transaction
    user = db.query(User).filter(User.email == body.email).first()
    if user:
        txn = Transaction(
            user_id=user.id,
            amount=package.price,
            type="mobile_money_package",
            status="pending",
            reference=reference,
            package_id=package.id,
        )
        db.add(txn)
        db.commit()

    charge_status = data.get("data", {}).get("status", "pending")
    return {
        "reference": reference,
        "status": charge_status,
        "package_id": package.id,
        "amount_kes": amount_kobo / 100,
        "provider": body.provider,
        "phone": phone,
        "message": data.get("message", "Payment prompt sent."),
    }


@router.get("/mobile-money/status")
async def mobile_money_status(
    reference: str = Query(...),
    package_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """
    Poll Paystack for mobile money charge status.
    Returns: status "pending" | "success" | "failed"
    On success: credits are added and picks_added is returned.
    """
    txn = db.query(Transaction).filter(Transaction.reference == reference).first()

    # Already credited — fast path
    if txn and txn.status == "success":
        pkg = db.query(Package).filter(Package.id == package_id).first()
        return {
            "status": "success",
            "picks_added": pkg.picks_count if pkg else 0,
            "already_credited": True,
        }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{PAYSTACK_BASE}/charge/{reference}",
                headers=get_paystack_headers(),
                timeout=20,
            )
            data = resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Paystack mobile money status error: {e}")
        raise HTTPException(status_code=502, detail="Could not check payment status. Please try again.")

    if not data.get("status"):
        return {"status": "pending"}

    charge_status = (data.get("data", {}).get("status") or "pending").lower()

    if charge_status == "success":
        package = db.query(Package).filter(Package.id == package_id).first()
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")

        picks_count = package.picks_count
        email = data.get("data", {}).get("customer", {}).get("email", "")
        user = db.query(User).filter(User.email == email).first()

        if not user and txn:
            user = db.query(User).filter(User.id == txn.user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found for this payment")

        # Mark transaction success
        if txn:
            txn.status = "success"
            txn.verified_at = datetime.utcnow()
        else:
            txn = Transaction(
                user_id=user.id,
                amount=float(package.price),
                type="mobile_money_package",
                status="success",
                reference=reference,
                package_id=package_id,
                verified_at=datetime.utcnow(),
            )
            db.add(txn)

        # Add credits
        user_pkg = db.query(UserPackage).filter(UserPackage.user_id == user.id).first()
        if user_pkg:
            user_pkg.remaining_picks += picks_count
        else:
            user_pkg = UserPackage(user_id=user.id, remaining_picks=picks_count)
            db.add(user_pkg)

        # Referral commission
        if user.referred_by:
            commission = round(float(package.price) * settings.PARTNER_COMMISSION_RATE, 2)
            earning = ReferralEarning(
                user_id=user.referred_by,
                referred_user_id=user.id,
                amount=commission,
                subscription_amount=float(package.price),
                commission_rate=settings.PARTNER_COMMISSION_RATE,
                status="pending",
            )
            db.add(earning)
            logger.info(f"Commission ${commission} created for referrer {user.referred_by}")

        db.commit()

        return {
            "status": "success",
            "picks_added": picks_count,
            "picks_remaining": user_pkg.remaining_picks,
        }

    if charge_status in ("failed", "abandoned", "reversed"):
        if txn:
            txn.status = "failed"
            db.commit()
        return {"status": "failed", "message": "Mobile money payment failed or was cancelled."}

    return {"status": "pending"}


# ---------------------------------------------------------------------------
# Paystack Webhook
# ---------------------------------------------------------------------------

@router.post("/webhook")
async def paystack_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Paystack webhook endpoint.
    Configure in your Paystack dashboard:
    Live Webhook URL: https://sure-odds.onrender.com/paystack/webhook

    Handles: charge.success events as a fallback / server-side confirmation.
    """
    body = await request.body()
    sig = request.headers.get("x-paystack-signature", "")
    secret = settings.paystack_secret_key

    if secret:
        expected = hmac.new(secret.encode(), body, hashlib.sha512).hexdigest()
        if not hmac.compare_digest(expected, sig):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload = json_lib.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = payload.get("event")
    data = payload.get("data", {})

    if event == "charge.success":
        reference = data.get("reference", "")
        txn = db.query(Transaction).filter(Transaction.reference == reference).first()

        if txn and txn.status != "success":
            meta = data.get("metadata", {})
            package_id = meta.get("package_id") or (txn.package_id if txn else None)
            email = data.get("customer", {}).get("email", "")

            user = db.query(User).filter(User.email == email).first()
            if not user and txn:
                user = db.query(User).filter(User.id == txn.user_id).first()

            if user and package_id:
                package = db.query(Package).filter(Package.id == package_id).first()
                if package:
                    txn.status = "success"
                    txn.verified_at = datetime.utcnow()

                    user_pkg = db.query(UserPackage).filter(UserPackage.user_id == user.id).first()
                    if user_pkg:
                        user_pkg.remaining_picks += package.picks_count
                    else:
                        user_pkg = UserPackage(user_id=user.id, remaining_picks=package.picks_count)
                        db.add(user_pkg)

                    db.commit()
                    logger.info(f"Webhook: credited {package.picks_count} picks to user {user.id} for ref {reference}")

    return {"status": "ok"}

"""
IntaSend M-Pesa / Mobile Money payment integration.
Supports STK push for M-Pesa (Kenya) — pays in KES.

Flow:
  1. POST /intasend/mpesa/initialize  → triggers STK push, returns invoice_id
  2. GET  /intasend/mpesa/status?invoice_id=  → poll for COMPLETE / FAILED
  3. On COMPLETE → credits added to user, returns picks_added
"""

import httpx
import logging
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

router = APIRouter(prefix="/intasend", tags=["intasend"])

INTASEND_BASE = "https://payment.intasend.com/api/v1"


class MpesaInitRequest(BaseModel):
    package_id: int
    phone_number: str
    email: str


def _intasend_headers():
    key = settings.INTASEND_SECRET_KEY or settings.INTASEND_API_KEY
    if not key:
        raise HTTPException(
            status_code=503,
            detail="M-Pesa payments are not configured. Please contact support."
        )
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _normalize_phone(phone: str) -> str:
    """Normalize phone number to 254XXXXXXXXX format."""
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+"):
        phone = phone[1:]
    if phone.startswith("07") or phone.startswith("01"):
        phone = "254" + phone[1:]
    if phone.startswith("7") or phone.startswith("1"):
        phone = "254" + phone
    return phone


@router.post("/mpesa/initialize")
async def initialize_mpesa(
    body: MpesaInitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger an M-Pesa STK push for a pick package.
    Returns invoice_id — frontend polls /status?invoice_id= to confirm.
    """
    package = db.query(Package).filter(
        Package.id == body.package_id,
        Package.is_active == True
    ).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    phone = _normalize_phone(body.phone_number)
    if not phone.startswith("254") or len(phone) != 12:
        raise HTTPException(
            status_code=400,
            detail="Invalid phone number. Use format 07XXXXXXXX or 254XXXXXXXXX"
        )

    # Package price is in USD; convert to KES for the STK push
    kes_amount = int(float(package.price) * settings.USD_TO_KES_RATE)

    payload = {
        "amount": kes_amount,
        "phone_number": phone,
        "currency": "KES",
        "email": body.email,
        "comment": f"Sure Odds — {package.name}",
        "api_ref": f"SO-MPESA-{current_user.id[:8]}",
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{INTASEND_BASE}/payment/mpesa-stk-push/",
                headers=_intasend_headers(),
                json=payload,
                timeout=30,
            )
            data = resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"IntaSend STK push error: {e}")
        raise HTTPException(status_code=502, detail="M-Pesa gateway unreachable. Please try again.")

    if resp.status_code not in (200, 201):
        detail = data.get("detail") or data.get("message") or "M-Pesa request failed"
        logger.error(f"IntaSend error: {data}")
        raise HTTPException(status_code=400, detail=detail)

    invoice = data.get("invoice", {})
    invoice_id = invoice.get("invoice_id") or data.get("id")

    if not invoice_id:
        raise HTTPException(status_code=502, detail="No invoice ID returned by M-Pesa gateway")

    # Record a pending transaction
    txn = Transaction(
        user_id=current_user.id,
        amount=float(package.price),
        type="mpesa_package",
        status="pending",
        reference=f"MPESA-{invoice_id}",
        package_id=package.id,
    )
    db.add(txn)
    db.commit()

    return {
        "invoice_id": invoice_id,
        "package_id": package.id,
        "amount_usd": float(package.price),
        "amount_kes": kes_amount,
        "currency": "KES",
        "phone": phone,
        "message": "STK push sent. Enter your M-Pesa PIN when prompted.",
    }


@router.get("/mpesa/status")
async def mpesa_payment_status(
    invoice_id: str = Query(...),
    package_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Poll IntaSend for payment status.
    Returns:
      - status: "PENDING" | "COMPLETE" | "FAILED"
      - On COMPLETE: credits are added and picks_added is returned.
    """
    ref = f"MPESA-{invoice_id}"
    txn = db.query(Transaction).filter(Transaction.reference == ref).first()

    # Already credited — fast path
    if txn and txn.status == "success":
        pkg = db.query(Package).filter(Package.id == package_id).first()
        return {
            "status": "COMPLETE",
            "picks_added": pkg.picks_count if pkg else 0,
            "already_credited": True,
        }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{INTASEND_BASE}/payment/{invoice_id}/",
                headers=_intasend_headers(),
                timeout=20,
            )
            data = resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"IntaSend status check error: {e}")
        raise HTTPException(status_code=502, detail="Could not check payment status. Please try again.")

    invoice = data.get("invoice", data)
    state = (invoice.get("state") or "").upper()

    if state == "COMPLETE":
        # Fetch package
        package = db.query(Package).filter(Package.id == package_id).first()
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")

        picks_count = package.picks_count

        # Mark transaction success
        if txn:
            txn.status = "success"
            txn.verified_at = datetime.utcnow()
        else:
            txn = Transaction(
                user_id=current_user.id,
                amount=float(package.price),
                type="mpesa_package",
                status="success",
                reference=ref,
                package_id=package_id,
                verified_at=datetime.utcnow(),
            )
            db.add(txn)

        # Add credits
        user_pkg = db.query(UserPackage).filter(UserPackage.user_id == current_user.id).first()
        if user_pkg:
            user_pkg.remaining_picks += picks_count
        else:
            user_pkg = UserPackage(user_id=current_user.id, remaining_picks=picks_count)
            db.add(user_pkg)

        db.commit()

        return {
            "status": "COMPLETE",
            "picks_added": picks_count,
            "picks_remaining": user_pkg.remaining_picks,
        }

    if state in ("FAILED", "CANCELLED"):
        if txn:
            txn.status = "failed"
            db.commit()
        return {"status": "FAILED", "message": "M-Pesa payment failed or was cancelled."}

    return {"status": "PENDING"}

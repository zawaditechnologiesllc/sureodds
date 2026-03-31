"""
Bundles router — list, view, and purchase pre-generated betting bundles.

IMPORTANT: /verify/payment MUST be declared BEFORE /{bundle_id} so FastAPI
does not swallow the literal path segment "verify" as a bundle_id parameter.
"""
import json
import secrets
import logging
import httpx
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.config import settings
from app.models.models import Bundle, BundlePurchase, User
from app.routers.users import get_current_user, optional_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bundles", tags=["bundles"])

PAYSTACK_BASE = "https://api.paystack.co"


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class BundleOut(BaseModel):
    id: str
    name: str
    total_odds: float
    tier: str
    price: float
    currency: str
    pick_count: int
    is_active: bool
    expires_at: Optional[str]
    picks: Optional[list]
    purchased: bool

    class Config:
        from_attributes = True


class PurchaseRequest(BaseModel):
    email: str
    callback_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_paystack_headers():
    if not settings.paystack_secret_key:
        raise HTTPException(status_code=503, detail="Payment service not configured.")
    return {
        "Authorization": f"Bearer {settings.paystack_secret_key}",
        "Content-Type": "application/json",
    }


def _has_purchased(db: Session, bundle_id: str, user_id: str) -> bool:
    return db.query(BundlePurchase).filter(
        BundlePurchase.bundle_id == bundle_id,
        BundlePurchase.user_id == user_id,
        BundlePurchase.status == "success",
    ).first() is not None


def _bundle_to_out(bundle: Bundle, purchased: bool) -> dict:
    picks_raw = json.loads(bundle.picks) if bundle.picks else []
    return {
        "id": bundle.id,
        "name": bundle.name,
        "total_odds": bundle.total_odds,
        "tier": bundle.tier,
        "price": bundle.price,
        "currency": bundle.currency,
        "pick_count": len(picks_raw),
        "is_active": bundle.is_active,
        "expires_at": bundle.expires_at.isoformat() if bundle.expires_at else None,
        "picks": picks_raw if purchased else None,
        "purchased": purchased,
    }


# ---------------------------------------------------------------------------
# Routes — NOTE: fixed-path routes (/verify/payment) MUST come before
# parameterised routes (/{bundle_id}) or FastAPI will match the wrong handler.
# ---------------------------------------------------------------------------

@router.get("")
async def list_bundles(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(optional_current_user),
):
    """List all active bundles. Picks are hidden until purchased."""
    bundles = (
        db.query(Bundle)
        .filter(Bundle.is_active == True)
        .order_by(Bundle.total_odds)
        .all()
    )
    result = []
    for b in bundles:
        purchased = _has_purchased(db, b.id, current_user.id) if current_user else False
        result.append(_bundle_to_out(b, purchased))
    return result


# ── This MUST be before /{bundle_id} ────────────────────────────────────────
@router.get("/verify/payment")
async def verify_bundle_payment(
    reference: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Verify a bundle payment and unlock picks for the user.
    Called after returning from Paystack redirect.
    """
    purchase = db.query(BundlePurchase).filter(
        BundlePurchase.reference == reference
    ).first()

    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase record not found")

    if purchase.status == "success":
        bundle = db.query(Bundle).filter(Bundle.id == purchase.bundle_id).first()
        picks_raw = json.loads(bundle.picks) if bundle and bundle.picks else []
        return {
            "status": "already_verified",
            "reference": reference,
            "picks": picks_raw,
        }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{PAYSTACK_BASE}/transaction/verify/{reference}",
                headers=_get_paystack_headers(),
                timeout=30,
            )
            data = resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Paystack bundle verify error: {e}")
        raise HTTPException(status_code=502, detail="Payment gateway unreachable. Please try again.")

    if not data.get("status") or data["data"]["status"] != "success":
        purchase.status = "failed"
        db.commit()
        raise HTTPException(status_code=400, detail="Payment not successful or not found")

    purchase.status = "success"
    purchase.verified_at = datetime.utcnow()
    db.commit()

    bundle = db.query(Bundle).filter(Bundle.id == purchase.bundle_id).first()
    picks_raw = json.loads(bundle.picks) if bundle and bundle.picks else []

    return {
        "status": "success",
        "reference": reference,
        "bundle_id": purchase.bundle_id,
        "picks": picks_raw,
    }


@router.get("/{bundle_id}")
async def get_bundle(
    bundle_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(optional_current_user),
):
    """Get a single bundle. Picks revealed only if user purchased it."""
    bundle = db.query(Bundle).filter(Bundle.id == bundle_id).first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")

    purchased = _has_purchased(db, bundle_id, current_user.id) if current_user else False
    return _bundle_to_out(bundle, purchased)


@router.post("/{bundle_id}/purchase")
async def purchase_bundle(
    bundle_id: str,
    body: PurchaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Initialize a Paystack payment for a bundle.
    Returns the Paystack authorization_url to redirect the user to.
    """
    bundle = db.query(Bundle).filter(
        Bundle.id == bundle_id, Bundle.is_active == True
    ).first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found or no longer available")

    if _has_purchased(db, bundle_id, current_user.id):
        raise HTTPException(status_code=400, detail="You have already purchased this bundle")

    reference = f"SB-{secrets.token_hex(8).upper()}"
    # price is stored in KES; Paystack amount = KES * 100 (smallest unit)
    amount_kobo = int(float(bundle.price) * 100)

    payload = {
        "email": body.email,
        "amount": amount_kobo,
        "reference": reference,
        "currency": "KES",
        "metadata": {
            "bundle_id": bundle.id,
            "bundle_name": bundle.name,
            "tier": bundle.tier,
            "type": "bundle",
        },
    }
    if body.callback_url:
        payload["callback_url"] = body.callback_url

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{PAYSTACK_BASE}/transaction/initialize",
                headers=_get_paystack_headers(),
                json=payload,
                timeout=30,
            )
            data = resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Paystack bundle payment init error: {e}")
        raise HTTPException(status_code=502, detail="Payment gateway unreachable. Please try again.")

    if not data.get("status"):
        raise HTTPException(status_code=400, detail=data.get("message", "Payment initialization failed"))

    purchase = BundlePurchase(
        bundle_id=bundle.id,
        user_id=current_user.id,
        reference=reference,
        amount=bundle.price,
        status="pending",
    )
    db.add(purchase)
    db.commit()

    return {
        "authorization_url": data["data"]["authorization_url"],
        "reference": reference,
        "bundle": {
            "id": bundle.id,
            "name": bundle.name,
            "price": bundle.price,
            "tier": bundle.tier,
        },
    }

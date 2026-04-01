"""
IntaSend Mobile Money payment integration.

Supported markets:
  - Kenya  (KE): M-Pesa STK push via /payment/mpesa-stk-push/
  - Tanzania (TZ): M-Pesa TZ, Airtel, Tigo via /payment/collection/
  - Uganda   (UG): MTN, Airtel via /payment/collection/

Supported purchase types:
  - Pick credit packages  (package_type = "credits")
  - VIP time-based access (package_type = "vip")
  - Bundles               (bundle purchases)

Flow (all types):
  1. POST /intasend/mpesa/initialize          → STK push, returns invoice_id
  2. GET  /intasend/mpesa/status              → poll; credits / VIP granted on COMPLETE
  3. POST /intasend/mpesa/bundle/initialize   → STK push for a bundle, returns invoice_id
  4. GET  /intasend/mpesa/bundle/status       → poll; picks unlocked on COMPLETE
  5. POST /intasend/webhook                   → async server callback (backup crediting)
"""

import json as json_lib
import hashlib
import hmac
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.models import (
    Bundle, BundlePurchase, Package, Transaction, User,
    UserPackage, UserVipAccess, ReferralEarning,
)
from app.routers.users import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intasend", tags=["intasend"])

INTASEND_BASE = "https://payment.intasend.com/api/v1"


# ---------------------------------------------------------------------------
# Country config — currency, exchange rate, API endpoint, phone prefix
# ---------------------------------------------------------------------------

COUNTRY_CFG = {
    "KE": {
        "currency": "KES",
        "rate": lambda: settings.USD_TO_KES_RATE,
        "push_url": f"{INTASEND_BASE}/payment/mpesa-stk-push/",
        "status_url": lambda iid: f"{INTASEND_BASE}/payment/{iid}/",
        "prefix": "254",
        "length": 12,
        "default_channel": None,
    },
    "TZ": {
        "currency": "TZS",
        "rate": lambda: settings.USD_TO_TZS_RATE,
        "push_url": f"{INTASEND_BASE}/payment/collection/",
        "status_url": lambda iid: f"{INTASEND_BASE}/payment/collection/{iid}/",
        "prefix": "255",
        "length": 12,
        "default_channel": "M-PESA",
    },
    "UG": {
        "currency": "UGX",
        "rate": lambda: settings.USD_TO_UGX_RATE,
        "push_url": f"{INTASEND_BASE}/payment/collection/",
        "status_url": lambda iid: f"{INTASEND_BASE}/payment/collection/{iid}/",
        "prefix": "256",
        "length": 12,
        "default_channel": "MTN",
    },
}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class MpesaInitRequest(BaseModel):
    package_id: int
    phone_number: str
    email: str
    country: str = "KE"
    channel: Optional[str] = None


class MpesaBundleInitRequest(BaseModel):
    bundle_id: str
    phone_number: str
    email: str
    country: str = "KE"
    channel: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _headers():
    key = settings.INTASEND_SECRET_KEY or settings.INTASEND_API_KEY
    if not key:
        raise HTTPException(
            status_code=503,
            detail="Mobile money payments are not configured. Please contact support.",
        )
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def _cfg(country: str) -> dict:
    cfg = COUNTRY_CFG.get(country.upper())
    if not cfg:
        raise HTTPException(status_code=400, detail=f"Unsupported country: {country}. Use KE, TZ, or UG.")
    return cfg


def _normalize_phone(phone: str, country: str) -> str:
    cfg = _cfg(country)
    prefix = cfg["prefix"]
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+"):
        phone = phone[1:]
    # Strip leading zeros and local prefixes, then prepend country code
    local_prefixes = {"254": ["07", "01"], "255": ["07", "06", "0"], "256": ["07", "0"]}
    for pfx in local_prefixes.get(prefix, []):
        if phone.startswith(pfx):
            phone = prefix + phone[len(pfx):]
            break
    # If it starts with a single digit (no country code yet), prepend
    if not phone.startswith(prefix):
        phone = prefix + phone
    if len(phone) != cfg["length"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid phone number for {country}. Use local format e.g. 07XXXXXXXX.",
        )
    return phone


def _kes_amount(price_usd: float, pkg_currency: str, country: str) -> int:
    """Convert a package price to the local currency amount (integer, no sub-units)."""
    cfg = _cfg(country)
    rate = cfg["rate"]()
    if pkg_currency == "KES" and country == "KE":
        return int(float(price_usd))
    return int(float(price_usd) * rate)


async def _push(url: str, payload: dict) -> dict:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=_headers(), json=payload, timeout=30)
            data = resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"IntaSend push error: {e}")
        raise HTTPException(status_code=502, detail="Mobile money gateway unreachable. Please try again.")
    if resp.status_code not in (200, 201):
        detail = data.get("detail") or data.get("message") or "Mobile money request failed"
        logger.error(f"IntaSend error {resp.status_code}: {data}")
        raise HTTPException(status_code=400, detail=detail)
    return data


async def _fetch_status(invoice_id: str, country: str) -> dict:
    cfg = _cfg(country)
    url = cfg["status_url"](invoice_id)
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=_headers(), timeout=20)
            return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"IntaSend status error: {e}")
        raise HTTPException(status_code=502, detail="Could not check payment status. Please try again.")


def _extract_invoice_id(data: dict) -> str:
    invoice = data.get("invoice", {})
    iid = invoice.get("invoice_id") or data.get("id") or data.get("invoice_id")
    if not iid:
        raise HTTPException(status_code=502, detail="No invoice ID returned by gateway.")
    return str(iid)


def _extract_state(data: dict) -> str:
    invoice = data.get("invoice", data)
    return (invoice.get("state") or invoice.get("status") or "").upper()


def _grant_package(db: Session, user: User, package: Package, ref: str, txn: Optional[Transaction]):
    """Credit picks or VIP access after a successful payment."""
    pkg_type = getattr(package, "package_type", "credits") or "credits"
    duration_days = getattr(package, "duration_days", None)

    if txn:
        txn.status = "success"
        txn.verified_at = datetime.utcnow()
    else:
        txn = Transaction(
            user_id=user.id,
            amount=float(package.price),
            type="vip" if pkg_type == "vip" else "mpesa_package",
            status="success",
            reference=ref,
            package_id=package.id,
            verified_at=datetime.utcnow(),
        )
        db.add(txn)

    vip_expires_at = None
    user_pkg = None

    if pkg_type == "vip" and duration_days:
        now = datetime.utcnow()
        existing = (
            db.query(UserVipAccess)
            .filter(UserVipAccess.user_id == user.id, UserVipAccess.expires_at > now)
            .order_by(UserVipAccess.expires_at.desc())
            .first()
        )
        if existing:
            vip_expires_at = existing.expires_at + timedelta(days=duration_days)
            existing.expires_at = vip_expires_at
        else:
            vip_expires_at = now + timedelta(days=duration_days)
            db.add(UserVipAccess(
                user_id=user.id,
                package_id=package.id,
                expires_at=vip_expires_at,
                reference=ref,
            ))
        logger.info(f"VIP access granted to {user.id} until {vip_expires_at}")
    else:
        picks = package.picks_count or 0
        user_pkg = db.query(UserPackage).filter(UserPackage.user_id == user.id).first()
        if user_pkg:
            user_pkg.remaining_picks += picks
        else:
            user_pkg = UserPackage(user_id=user.id, remaining_picks=picks)
            db.add(user_pkg)

    # Referral commission
    if user.referred_by:
        commission = round(float(package.price) * settings.PARTNER_COMMISSION_RATE, 2)
        db.add(ReferralEarning(
            user_id=user.referred_by,
            referred_user_id=user.id,
            amount=commission,
            subscription_amount=float(package.price),
            commission_rate=settings.PARTNER_COMMISSION_RATE,
            status="pending",
        ))

    db.commit()

    if pkg_type == "vip":
        return {
            "status": "COMPLETE",
            "package_type": "vip",
            "vip_expires_at": vip_expires_at.isoformat() if vip_expires_at else None,
            "duration_days": duration_days,
        }
    return {
        "status": "COMPLETE",
        "picks_added": package.picks_count or 0,
        "picks_remaining": user_pkg.remaining_picks if user_pkg else 0,
    }


# ---------------------------------------------------------------------------
# Package routes (credits + VIP)
# ---------------------------------------------------------------------------

@router.post("/mpesa/initialize")
async def initialize_mpesa(
    body: MpesaInitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger a mobile money STK push for a pick or VIP package."""
    package = db.query(Package).filter(
        Package.id == body.package_id, Package.is_active == True
    ).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    country = body.country.upper()
    cfg = _cfg(country)
    phone = _normalize_phone(body.phone_number, country)
    amount = _kes_amount(float(package.price), package.currency, country)

    payload: dict = {
        "amount": amount,
        "phone_number": phone,
        "currency": cfg["currency"],
        "email": body.email,
        "comment": f"Sure Odds — {package.name}",
        "api_ref": f"SO-PKG-{current_user.id[:8]}",
    }
    channel = body.channel or cfg["default_channel"]
    if channel:
        payload["channel"] = channel

    data = await _push(cfg["push_url"], payload)
    invoice_id = _extract_invoice_id(data)

    db.add(Transaction(
        user_id=current_user.id,
        amount=float(package.price),
        type="mpesa_package",
        status="pending",
        reference=f"MPESA-{invoice_id}",
        package_id=package.id,
    ))
    db.commit()

    return {
        "invoice_id": invoice_id,
        "package_id": package.id,
        "amount": amount,
        "currency": cfg["currency"],
        "phone": phone,
        "country": country,
        "message": "Payment prompt sent. Enter your PIN when prompted.",
    }


@router.get("/mpesa/status")
async def mpesa_status(
    invoice_id: str = Query(...),
    package_id: int = Query(...),
    country: str = Query("KE"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Poll IntaSend for payment status; grants credits or VIP on COMPLETE."""
    ref = f"MPESA-{invoice_id}"
    txn = db.query(Transaction).filter(Transaction.reference == ref).first()

    if txn and txn.status == "success":
        package = db.query(Package).filter(Package.id == package_id).first()
        pkg_type = getattr(package, "package_type", "credits") if package else "credits"
        if pkg_type == "vip":
            vip = (
                db.query(UserVipAccess)
                .filter(UserVipAccess.user_id == current_user.id)
                .order_by(UserVipAccess.expires_at.desc())
                .first()
            )
            return {
                "status": "COMPLETE",
                "package_type": "vip",
                "already_credited": True,
                "vip_expires_at": vip.expires_at.isoformat() if vip else None,
            }
        return {"status": "COMPLETE", "picks_added": package.picks_count if package else 0, "already_credited": True}

    data = await _fetch_status(invoice_id, country)
    state = _extract_state(data)

    if state == "COMPLETE":
        package = db.query(Package).filter(Package.id == package_id).first()
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        return _grant_package(db, current_user, package, ref, txn)

    if state in ("FAILED", "CANCELLED"):
        if txn:
            txn.status = "failed"
            db.commit()
        return {"status": "FAILED", "message": "Payment failed or was cancelled."}

    return {"status": "PENDING"}


# ---------------------------------------------------------------------------
# Bundle routes
# ---------------------------------------------------------------------------

@router.post("/mpesa/bundle/initialize")
async def initialize_mpesa_bundle(
    body: MpesaBundleInitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger a mobile money STK push to purchase a bundle."""
    from app.routers.bundles import _has_purchased, _calc_pricing
    import json, secrets as secrets_mod

    bundle = db.query(Bundle).filter(Bundle.id == body.bundle_id, Bundle.is_active == True).first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found or no longer available")

    if _has_purchased(db, bundle.id, current_user.id):
        raise HTTPException(status_code=400, detail="You have already purchased this bundle")

    picks_raw = json.loads(bundle.picks) if bundle.picks else []
    _played, remaining, current_price = _calc_pricing(bundle.price, picks_raw)
    if remaining == 0:
        raise HTTPException(status_code=400, detail="All games in this bundle have already kicked off.")

    country = body.country.upper()
    cfg = _cfg(country)
    phone = _normalize_phone(body.phone_number, country)
    amount = int(float(current_price) * cfg["rate"]())

    payload: dict = {
        "amount": amount,
        "phone_number": phone,
        "currency": cfg["currency"],
        "email": body.email,
        "comment": f"Sure Odds Bundle — {bundle.name}",
        "api_ref": f"SB-{secrets_mod.token_hex(6).upper()}",
    }
    channel = body.channel or cfg["default_channel"]
    if channel:
        payload["channel"] = channel

    data = await _push(cfg["push_url"], payload)
    invoice_id = _extract_invoice_id(data)

    purchase = BundlePurchase(
        bundle_id=bundle.id,
        user_id=current_user.id,
        reference=f"MPESA-{invoice_id}",
        amount=current_price,
        status="pending",
    )
    db.add(purchase)
    db.commit()

    return {
        "invoice_id": invoice_id,
        "bundle_id": bundle.id,
        "amount": amount,
        "currency": cfg["currency"],
        "phone": phone,
        "country": country,
        "message": "Payment prompt sent. Enter your PIN when prompted.",
    }


@router.get("/mpesa/bundle/status")
async def mpesa_bundle_status(
    invoice_id: str = Query(...),
    bundle_id: str = Query(...),
    country: str = Query("KE"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Poll IntaSend for bundle payment status; unlocks picks on COMPLETE."""
    import json
    ref = f"MPESA-{invoice_id}"
    purchase = db.query(BundlePurchase).filter(BundlePurchase.reference == ref).first()

    if purchase and purchase.status == "success":
        bundle = db.query(Bundle).filter(Bundle.id == bundle_id).first()
        picks_raw = json.loads(bundle.picks) if bundle and bundle.picks else []
        return {"status": "COMPLETE", "picks": picks_raw, "already_credited": True}

    data = await _fetch_status(invoice_id, country)
    state = _extract_state(data)

    if state == "COMPLETE":
        bundle = db.query(Bundle).filter(Bundle.id == bundle_id).first()
        if not bundle:
            raise HTTPException(status_code=404, detail="Bundle not found")

        if purchase:
            purchase.status = "success"
            purchase.verified_at = datetime.utcnow()
        else:
            purchase = BundlePurchase(
                bundle_id=bundle_id,
                user_id=current_user.id,
                reference=ref,
                amount=bundle.price,
                status="success",
                verified_at=datetime.utcnow(),
            )
            db.add(purchase)
        db.commit()

        picks_raw = json.loads(bundle.picks) if bundle.picks else []
        return {"status": "COMPLETE", "picks": picks_raw}

    if state in ("FAILED", "CANCELLED"):
        if purchase:
            purchase.status = "failed"
            db.commit()
        return {"status": "FAILED", "message": "Payment failed or was cancelled."}

    return {"status": "PENDING"}


# ---------------------------------------------------------------------------
# Webhook (server-to-server callback from IntaSend — backup crediting)
# ---------------------------------------------------------------------------

@router.post("/webhook")
async def intasend_webhook(request: Request, db: Session = Depends(get_db)):
    """
    IntaSend server-to-server callback.
    Verifies the HMAC signature and credits the user if payment is COMPLETE.
    Set this URL in your IntaSend dashboard: https://yourapi.onrender.com/intasend/webhook
    """
    body_bytes = await request.body()
    sig = request.headers.get("X-IntaSend-Signature", "")
    secret = settings.INTASEND_SECRET_KEY or settings.INTASEND_API_KEY

    if secret and sig:
        expected = hmac.new(secret.encode(), body_bytes, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            logger.warning("IntaSend webhook: invalid signature — ignoring.")
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload = json_lib.loads(body_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    invoice = payload.get("invoice", payload)
    state = (invoice.get("state") or invoice.get("status") or "").upper()
    api_ref = invoice.get("api_ref", "")
    invoice_id = str(invoice.get("invoice_id") or invoice.get("id") or "")

    if state != "COMPLETE":
        return {"received": True}

    ref = f"MPESA-{invoice_id}"

    # Bundle purchase
    if api_ref.startswith("SB-"):
        purchase = db.query(BundlePurchase).filter(BundlePurchase.reference == ref).first()
        if purchase and purchase.status != "success":
            purchase.status = "success"
            purchase.verified_at = datetime.utcnow()
            db.commit()
            logger.info(f"Webhook: bundle purchase {ref} credited")
        return {"received": True}

    # Package purchase
    txn = db.query(Transaction).filter(Transaction.reference == ref).first()
    if txn and txn.status == "success":
        return {"received": True}

    if txn and txn.package_id:
        package = db.query(Package).filter(Package.id == txn.package_id).first()
        user = db.query(User).filter(User.id == txn.user_id).first()
        if package and user:
            _grant_package(db, user, package, ref, txn)
            logger.info(f"Webhook: package purchase {ref} credited to {user.id}")

    return {"received": True}

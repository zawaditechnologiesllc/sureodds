from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import date, timedelta, datetime, timezone
from typing import List, Optional
from app.core.database import get_db
from app.models.models import User, Fixture, Prediction, Bundle, PartnerApplication, Notification, Transaction, BundlePurchase, UserPackage, Package, ReferralEarning, PartnerPayoutSettings, UserVipAccess
from app.services.fixtures_service import (
    update_all_fixtures,
    fetch_upcoming,
    fetch_results,
    get_api_status,
    get_current_season,
    get_daily_request_count,
    MAX_DAILY_REQUESTS,
    SOFASCORE_BASE,
    SOFASCORE_HEADERS,
)
from app.services.results_service import update_results
from app.services.prediction_engine import generate_prediction
from app.services.bundle_generator import generate_and_save_bundle, TIER_CONFIG
from app.core.config import settings
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])


def _valid_admin_key(key: str) -> bool:
    """Return True if the key matches any configured admin credential."""
    if settings.ADMIN_PASSWORD and key == settings.ADMIN_PASSWORD:
        return True
    if key == settings.SECRET_KEY:
        return True
    return False


def verify_admin(x_admin_key: str = Header(None)):
    if settings.ENVIRONMENT == "development":
        return
    if x_admin_key and _valid_admin_key(x_admin_key):
        return
    raise HTTPException(status_code=403, detail="Not authorized")


class AdminLoginRequest(BaseModel):
    email: str
    password: str


@router.post("/token")
def admin_login(body: AdminLoginRequest):
    """Exchange admin email+password for confirmation.
    Returns 200 so the frontend knows the credentials are valid.
    The password itself is then used as the x-admin-key on subsequent calls.
    In development mode with no ADMIN_PASSWORD set, any password is accepted for the correct email.
    """
    email_ok = body.email.strip().lower() == settings.ADMIN_EMAIL.strip().lower()
    if not email_ok:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # In development with no password configured, allow through on correct email
    if settings.ENVIRONMENT == "development" and not settings.ADMIN_PASSWORD:
        return {"ok": True}

    password_ok = bool(settings.ADMIN_PASSWORD) and body.password == settings.ADMIN_PASSWORD
    if not password_ok:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"ok": True}


class UserAdminOut(BaseModel):
    id: str
    email: str
    isPaid: bool
    createdAt: str

    class Config:
        from_attributes = True


@router.get("/users", dependencies=[Depends(verify_admin)])
async def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).limit(100).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "isPaid": u.subscription_status == "paid",
            "createdAt": u.created_at.isoformat() if u.created_at else "",
            "referralCode": u.referral_code,
        }
        for u in users
    ]


@router.get("/predictions", dependencies=[Depends(verify_admin)])
async def list_predictions(db: Session = Depends(get_db)):
    preds = (
        db.query(Prediction, Fixture)
        .join(Fixture, Prediction.fixture_id == Fixture.id)
        .order_by(Fixture.kickoff.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": p.id,
            "fixture": f"{fix.home_team_name} vs {fix.away_team_name}",
            "kickoff": fix.kickoff.isoformat(),
            "bestPick": p.best_pick,
            "confidence": p.confidence,
            "isCorrect": p.is_correct,
        }
        for p, fix in preds
    ]


@router.get("/stats", dependencies=[Depends(verify_admin)])
async def get_stats(db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    paid_users = db.query(User).filter(User.subscription_status == "paid").count()
    today = date.today()
    today_predictions = (
        db.query(Prediction)
        .join(Fixture, Prediction.fixture_id == Fixture.id)
        .filter(cast(Fixture.kickoff, Date) == today)
        .count()
    )
    total_fixtures = db.query(Fixture).count()
    today_fixtures = (
        db.query(Fixture)
        .filter(cast(Fixture.kickoff, Date) == today)
        .count()
    )
    return {
        "total_users": total_users,
        "paid_users": paid_users,
        "free_users": total_users - paid_users,
        "today_predictions": today_predictions,
        "total_fixtures": total_fixtures,
        "today_fixtures": today_fixtures,
        "api_key_configured": True,   # Sofascore needs no key
        "environment": settings.ENVIRONMENT,
        "current_season": get_current_season(),
        "data_source": "sofascore.com",
    }


@router.get("/api-status", dependencies=[Depends(verify_admin)])
async def admin_api_status():
    """Return Sofascore scraper status — no API key required."""
    status = await get_api_status()
    return {
        "season": get_current_season(),
        "api_key_set": True,
        **status,
    }


# /admin/run-update — full fixture refresh (past 5 days + today + next 3 days)
@router.post("/run-update", dependencies=[Depends(verify_admin)])
async def trigger_run_update(db: Session = Depends(get_db)):
    """Manually trigger a full fixture fetch (2 API calls)."""
    result = await update_all_fixtures(db)
    return {"success": True, **result}


@router.post("/update-fixtures", dependencies=[Depends(verify_admin)])
async def trigger_update_fixtures(db: Session = Depends(get_db)):
    result = await update_all_fixtures(db)
    return {"success": True, **result}


# /admin/run-predictions — generate predictions for today and next 14 days
@router.post("/run-predictions", dependencies=[Depends(verify_admin)])
async def trigger_run_predictions(db: Session = Depends(get_db)):
    today = date.today()
    # 14-day window covers fixtures after international breaks
    upcoming_dates = [today + timedelta(days=i) for i in range(15)]

    fixtures = (
        db.query(Fixture)
        .filter(
            cast(Fixture.kickoff, Date).in_(upcoming_dates),
            Fixture.status == "scheduled",
        )
        .filter(~Fixture.id.in_(db.query(Prediction.fixture_id)))
        .all()
    )

    created = 0
    for fixture in fixtures:
        try:
            probabilities = await generate_prediction(
                fixture.home_team_id,
                fixture.away_team_id,
                fixture.league_id,
                fixture.season,
                db=db,
            )
            prediction = Prediction(fixture_id=fixture.id, **probabilities)
            db.add(prediction)
            created += 1
        except Exception:
            continue

    db.commit()
    return {"success": True, "predictions_created": created}


# /admin/run-results — reconcile results from DB (no API call)
@router.post("/run-results", dependencies=[Depends(verify_admin)])
async def trigger_run_results(db: Session = Depends(get_db)):
    """Reconcile prediction outcomes against finished matches in the DB."""
    result = await update_results(db)
    return {"success": True, **result}


@router.post("/update-results", dependencies=[Depends(verify_admin)])
async def trigger_update_results(db: Session = Depends(get_db)):
    result = await update_results(db)
    return {"success": True, **result}


# ---------------------------------------------------------------------------
# Bundle management
# ---------------------------------------------------------------------------

@router.get("/bundles", dependencies=[Depends(verify_admin)])
async def list_all_bundles(db: Session = Depends(get_db)):
    """List all bundles (active and inactive) for admin review."""
    import json
    bundles = db.query(Bundle).order_by(Bundle.created_at.desc()).limit(50).all()
    return [
        {
            "id": b.id,
            "name": b.name,
            "tier": b.tier,
            "total_odds": b.total_odds,
            "price": b.price,
            "pick_count": len(json.loads(b.picks)) if b.picks else 0,
            "is_active": b.is_active,
            "expires_at": b.expires_at.isoformat() if b.expires_at else None,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in bundles
    ]


@router.post("/bundles/generate/{tier}", dependencies=[Depends(verify_admin)])
async def generate_bundle_endpoint(tier: str, db: Session = Depends(get_db)):
    """
    Generate a new bundle for the given tier (safe / medium / high / mega).
    Deactivates any previous bundle of the same tier.
    """
    if tier not in TIER_CONFIG:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown tier '{tier}'. Valid tiers: {list(TIER_CONFIG)}"
        )

    bundle = generate_and_save_bundle(db, tier)
    if not bundle:
        raise HTTPException(
            status_code=422,
            detail="Not enough qualifying matches to generate this bundle. "
                   "Run predictions first or wait for more fixtures."
        )

    import json
    return {
        "success": True,
        "bundle": {
            "id": bundle.id,
            "name": bundle.name,
            "tier": bundle.tier,
            "total_odds": bundle.total_odds,
            "price": bundle.price,
            "pick_count": len(json.loads(bundle.picks)) if bundle.picks else 0,
            "is_active": bundle.is_active,
        },
    }


@router.post("/bundles/{bundle_id}/deactivate", dependencies=[Depends(verify_admin)])
async def deactivate_bundle(bundle_id: str, db: Session = Depends(get_db)):
    """Manually deactivate (unpublish) a bundle so users cannot see or buy it."""
    bundle = db.query(Bundle).filter(Bundle.id == bundle_id).first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    bundle.is_active = False
    db.commit()
    return {"success": True, "bundle_id": bundle_id, "is_active": False}


@router.post("/bundles/{bundle_id}/activate", dependencies=[Depends(verify_admin)])
async def activate_bundle(bundle_id: str, db: Session = Depends(get_db)):
    """Manually activate (publish) a bundle so users can see and buy it."""
    bundle = db.query(Bundle).filter(Bundle.id == bundle_id).first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    bundle.is_active = True
    db.commit()
    return {"success": True, "bundle_id": bundle_id, "is_active": True}


# ---------------------------------------------------------------------------
# Partner application management
# ---------------------------------------------------------------------------

@router.get("/partners", dependencies=[Depends(verify_admin)])
async def list_partner_applications(db: Session = Depends(get_db)):
    """List all partner applications ordered by submission date."""
    apps = (
        db.query(PartnerApplication)
        .order_by(PartnerApplication.submitted_at.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id": a.id,
            "name": a.name,
            "email": a.email,
            "platform": a.platform,
            "handle": a.handle,
            "followers": a.followers,
            "website": a.website,
            "why": a.why,
            "status": a.status,
            "notes": a.notes,
            "submittedAt": a.submitted_at.isoformat() if a.submitted_at else None,
            "reviewedAt": a.reviewed_at.isoformat() if a.reviewed_at else None,
        }
        for a in apps
    ]


@router.post("/partners/{app_id}/approve", dependencies=[Depends(verify_admin)])
async def approve_partner(app_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Approve a partner application, link user account, and send approval email."""
    app = db.query(PartnerApplication).filter(PartnerApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app.status = "approved"
    app.reviewed_at = datetime.now(timezone.utc)
    # Link user account by matching email
    if not app.user_id:
        user = db.query(User).filter(User.email == app.email).first()
        if user:
            app.user_id = user.id
    db.commit()
    # Send approval email in background
    partner_email = app.email
    partner_name = app.name
    background_tasks.add_task(_send_partner_approval_bg, partner_email, partner_name)
    return {"success": True, "id": app_id, "status": "approved", "user_linked": app.user_id is not None}


def _send_partner_approval_bg(email: str, name: str) -> None:
    """Background task wrapper for partner approval email."""
    try:
        from app.core.email import send_partner_approval_email
        send_partner_approval_email(email, name)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error("Failed to send partner approval email: %s", exc)


@router.post("/partners/{app_id}/reject", dependencies=[Depends(verify_admin)])
async def reject_partner(app_id: str, db: Session = Depends(get_db)):
    """Reject a partner application."""
    app = db.query(PartnerApplication).filter(PartnerApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app.status = "rejected"
    app.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    return {"success": True, "id": app_id, "status": "rejected"}


class TestEmailRequest(BaseModel):
    to: str


@router.post("/test-email", dependencies=[Depends(verify_admin)])
async def test_email(body: TestEmailRequest):
    """
    Send a test email to verify SMTP configuration.
    POST /admin/test-email  {\"to\": \"someone@example.com\"}
    """
    from app.core.email import send_email
    configured = bool(settings.SMTP_HOST and settings.SMTP_USER)
    if not configured:
        return {
            "sent": False,
            "reason": "SMTP not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS environment variables.",
            "smtp_host": settings.SMTP_HOST or "(not set)",
            "smtp_user": settings.SMTP_USER or "(not set)",
        }

    sent = send_email(
        to=body.to,
        subject="✅ Sure Odds — SMTP test email",
        html="""
        <div style="font-family:Arial,sans-serif;max-width:500px;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
          <h2 style="color:#ef4444;">Sure Odds SMTP Test</h2>
          <p>If you received this, your email configuration is working correctly! 🎉</p>
          <p style="color:#94a3b8;font-size:12px;">Sent from the Sure Odds backend via SMTP.</p>
        </div>
        """,
        text="Sure Odds SMTP test — if you received this, email is configured correctly!",
    )

    return {
        "sent": sent,
        "to": body.to,
        "smtp_host": settings.SMTP_HOST,
        "smtp_user": settings.SMTP_USER,
        "smtp_port": settings.SMTP_PORT,
    }


# ---------------------------------------------------------------------------
# Targeted day refresh — today & tomorrow predictions + results
# ---------------------------------------------------------------------------

@router.post("/run-today", dependencies=[Depends(verify_admin)])
async def trigger_run_today(db: Session = Depends(get_db)):
    """Refresh predictions and results for today only."""
    today = date.today()

    fixtures_today = (
        db.query(Fixture)
        .filter(cast(Fixture.kickoff, Date) == today, Fixture.status == "scheduled")
        .filter(~Fixture.id.in_(db.query(Prediction.fixture_id)))
        .all()
    )
    created = 0
    for fixture in fixtures_today:
        try:
            probabilities = await generate_prediction(
                fixture.home_team_id, fixture.away_team_id,
                fixture.league_id, fixture.season, db=db,
            )
            db.add(Prediction(fixture_id=fixture.id, **probabilities))
            created += 1
        except Exception:
            continue
    db.commit()

    results = await update_results(db)
    return {"success": True, "predictions_created": created, "results": results}


@router.post("/run-tomorrow", dependencies=[Depends(verify_admin)])
async def trigger_run_tomorrow(db: Session = Depends(get_db)):
    """Refresh predictions for tomorrow only."""
    tomorrow = date.today() + timedelta(days=1)

    fixtures_tomorrow = (
        db.query(Fixture)
        .filter(cast(Fixture.kickoff, Date) == tomorrow, Fixture.status == "scheduled")
        .filter(~Fixture.id.in_(db.query(Prediction.fixture_id)))
        .all()
    )
    created = 0
    for fixture in fixtures_tomorrow:
        try:
            probabilities = await generate_prediction(
                fixture.home_team_id, fixture.away_team_id,
                fixture.league_id, fixture.season, db=db,
            )
            db.add(Prediction(fixture_id=fixture.id, **probabilities))
            created += 1
        except Exception:
            continue
    db.commit()
    return {"success": True, "predictions_created": created}


# ---------------------------------------------------------------------------
# Payment management — list pending/failed, manually confirm
# ---------------------------------------------------------------------------

@router.get("/payments", dependencies=[Depends(verify_admin)])
async def list_payments(db: Session = Depends(get_db)):
    """List all pending and failed transactions (packages + bundles)."""
    txns = (
        db.query(Transaction)
        .filter(Transaction.status.in_(["pending", "failed"]))
        .order_by(Transaction.created_at.desc())
        .limit(100)
        .all()
    )
    bundle_txns = (
        db.query(BundlePurchase)
        .filter(BundlePurchase.status.in_(["pending", "failed"]))
        .order_by(BundlePurchase.created_at.desc())
        .limit(100)
        .all()
    )
    results = []
    for t in txns:
        results.append({
            "id": t.id,
            "type": "package",
            "user_id": t.user_id,
            "amount": t.amount,
            "status": t.status,
            "reference": t.reference,
            "package_id": t.package_id,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    for b in bundle_txns:
        results.append({
            "id": b.id,
            "type": "bundle",
            "user_id": b.user_id,
            "amount": b.amount,
            "status": b.status,
            "reference": b.reference,
            "bundle_id": b.bundle_id,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        })
    results.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return results


@router.post("/payments/{reference}/confirm", dependencies=[Depends(verify_admin)])
async def confirm_payment(reference: str, db: Session = Depends(get_db)):
    """Manually confirm a pending/failed payment and credit the user."""
    now = datetime.now(timezone.utc)

    txn = db.query(Transaction).filter(Transaction.reference == reference).first()
    if txn:
        if txn.status == "success":
            return {"success": True, "message": "Already confirmed", "type": "package"}
        txn.status = "success"
        txn.verified_at = now
        if txn.package_id:
            pkg = db.query(Package).filter(Package.id == txn.package_id).first()
            if pkg:
                up = db.query(UserPackage).filter(UserPackage.user_id == txn.user_id).first()
                if up:
                    up.remaining_picks += pkg.picks_count
                else:
                    db.add(UserPackage(user_id=txn.user_id, remaining_picks=pkg.picks_count))
        db.commit()
        return {"success": True, "type": "package", "reference": reference}

    bundle_txn = db.query(BundlePurchase).filter(BundlePurchase.reference == reference).first()
    if bundle_txn:
        if bundle_txn.status == "success":
            return {"success": True, "message": "Already confirmed", "type": "bundle"}
        bundle_txn.status = "success"
        bundle_txn.verified_at = now
        db.commit()
        return {"success": True, "type": "bundle", "reference": reference}

    raise HTTPException(status_code=404, detail="Transaction not found")


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class NotificationCreate(BaseModel):
    title: str
    message: str
    target: str = "all"  # "users" | "partners" | "all"


@router.get("/notifications", dependencies=[Depends(verify_admin)])
async def list_notifications(db: Session = Depends(get_db)):
    """List all admin notifications."""
    notifs = db.query(Notification).order_by(Notification.created_at.desc()).limit(100).all()
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "target": n.target,
            "is_active": n.is_active,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]


@router.post("/notifications", dependencies=[Depends(verify_admin)])
async def create_notification(body: NotificationCreate, db: Session = Depends(get_db)):
    """Create a new notification."""
    if body.target not in ("users", "partners", "all"):
        raise HTTPException(status_code=400, detail="target must be 'users', 'partners', or 'all'")
    notif = Notification(title=body.title, message=body.message, target=body.target)
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return {"success": True, "id": notif.id, "title": notif.title, "target": notif.target}


@router.delete("/notifications/{notif_id}", dependencies=[Depends(verify_admin)])
async def delete_notification(notif_id: int, db: Session = Depends(get_db)):
    """Delete a notification."""
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return {"success": True, "id": notif_id}


@router.patch("/notifications/{notif_id}/toggle", dependencies=[Depends(verify_admin)])
async def toggle_notification(notif_id: int, db: Session = Depends(get_db)):
    """Toggle a notification active/inactive."""
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_active = not notif.is_active
    db.commit()
    return {"success": True, "id": notif_id, "is_active": notif.is_active}


# ---------------------------------------------------------------------------
# Finance — full revenue, transactions, partner earnings & payouts
# ---------------------------------------------------------------------------

@router.get("/finance/summary", dependencies=[Depends(verify_admin)])
async def finance_summary(db: Session = Depends(get_db)):
    """Complete financial summary for the admin finance tab."""
    today = date.today()

    # Package revenue (successful transactions)
    pkg_txns = db.query(Transaction).filter(Transaction.status == "success").all()
    total_pkg_revenue = sum(t.amount for t in pkg_txns)
    today_pkg_revenue = sum(t.amount for t in pkg_txns if t.verified_at and t.verified_at.date() == today)

    # Bundle revenue (successful bundle purchases)
    bundle_txns = db.query(BundlePurchase).filter(BundlePurchase.status == "success").all()
    total_bundle_revenue = sum(b.amount for b in bundle_txns)
    today_bundle_revenue = sum(b.amount for b in bundle_txns if b.verified_at and b.verified_at.date() == today)

    # Pending revenue
    pending_pkg = db.query(Transaction).filter(Transaction.status == "pending").all()
    pending_bundle = db.query(BundlePurchase).filter(BundlePurchase.status == "pending").all()
    pending_revenue = sum(t.amount for t in pending_pkg) + sum(b.amount for b in pending_bundle)

    # Partner commissions
    all_earnings = db.query(ReferralEarning).all()
    total_commissions = sum(e.amount for e in all_earnings)
    pending_commissions = sum(e.amount for e in all_earnings if e.status == "pending")
    paid_commissions = sum(e.amount for e in all_earnings if e.status == "paid")

    net_revenue = (total_pkg_revenue + total_bundle_revenue) - paid_commissions

    return {
        "total_revenue": round(total_pkg_revenue + total_bundle_revenue, 2),
        "package_revenue": round(total_pkg_revenue, 2),
        "bundle_revenue": round(total_bundle_revenue, 2),
        "today_revenue": round(today_pkg_revenue + today_bundle_revenue, 2),
        "pending_revenue": round(pending_revenue, 2),
        "total_commissions": round(total_commissions, 2),
        "pending_commissions": round(pending_commissions, 2),
        "paid_commissions": round(paid_commissions, 2),
        "net_revenue": round(net_revenue, 2),
        "total_transactions": len(pkg_txns) + len(bundle_txns),
        "pending_transactions": len(pending_pkg) + len(pending_bundle),
    }


@router.get("/finance/transactions", dependencies=[Depends(verify_admin)])
async def finance_transactions(
    status: Optional[str] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    """All transactions (packages + bundles) with user email, filtered by status."""
    pkg_q = db.query(Transaction, User).join(User, Transaction.user_id == User.id)
    if status:
        pkg_q = pkg_q.filter(Transaction.status == status)
    pkg_rows = pkg_q.order_by(Transaction.created_at.desc()).limit(limit).all()

    bundle_q = db.query(BundlePurchase, User, Bundle).join(
        User, BundlePurchase.user_id == User.id
    ).join(Bundle, BundlePurchase.bundle_id == Bundle.id)
    if status:
        bundle_q = bundle_q.filter(BundlePurchase.status == status)
    bundle_rows = bundle_q.order_by(BundlePurchase.created_at.desc()).limit(limit).all()

    results = []
    for txn, user in pkg_rows:
        pkg = db.query(Package).filter(Package.id == txn.package_id).first() if txn.package_id else None
        results.append({
            "id": txn.id,
            "type": "package",
            "user_email": user.email,
            "user_id": user.id,
            "product": pkg.name if pkg else f"Package #{txn.package_id}",
            "amount": txn.amount,
            "status": txn.status,
            "reference": txn.reference,
            "created_at": txn.created_at.isoformat() if txn.created_at else None,
            "verified_at": txn.verified_at.isoformat() if txn.verified_at else None,
        })
    for bp, user, bundle in bundle_rows:
        results.append({
            "id": bp.id,
            "type": "bundle",
            "user_email": user.email,
            "user_id": user.id,
            "product": bundle.name,
            "amount": bp.amount,
            "status": bp.status,
            "reference": bp.reference,
            "created_at": bp.created_at.isoformat() if bp.created_at else None,
            "verified_at": bp.verified_at.isoformat() if bp.verified_at else None,
        })
    results.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return results[:limit]


@router.get("/finance/earnings", dependencies=[Depends(verify_admin)])
async def finance_earnings(db: Session = Depends(get_db)):
    """All partner referral earnings with partner info and payout settings."""
    earnings = (
        db.query(ReferralEarning, User)
        .join(User, ReferralEarning.user_id == User.id)
        .order_by(ReferralEarning.created_at.desc())
        .limit(200)
        .all()
    )
    result = []
    for earning, partner in earnings:
        referred = db.query(User).filter(User.id == earning.referred_user_id).first()
        payout = db.query(PartnerPayoutSettings).filter(PartnerPayoutSettings.user_id == partner.id).first()
        result.append({
            "id": earning.id,
            "partner_email": partner.email,
            "partner_id": partner.id,
            "referred_user_email": referred.email if referred else "—",
            "amount": earning.amount,
            "subscription_amount": earning.subscription_amount,
            "commission_rate": earning.commission_rate,
            "status": earning.status,
            "payout_method": payout.method if payout else None,
            "usdt_address": payout.usdt_address if payout else None,
            "bank_name": payout.bank_name if payout else None,
            "created_at": earning.created_at.isoformat() if earning.created_at else None,
            "paid_at": earning.paid_at.isoformat() if earning.paid_at else None,
        })
    return result


@router.post("/finance/earnings/{earning_id}/pay", dependencies=[Depends(verify_admin)])
async def mark_earning_paid(earning_id: int, db: Session = Depends(get_db)):
    """Mark a partner earning as paid."""
    earning = db.query(ReferralEarning).filter(ReferralEarning.id == earning_id).first()
    if not earning:
        raise HTTPException(status_code=404, detail="Earning not found")
    if earning.status == "paid":
        return {"success": True, "message": "Already paid"}
    earning.status = "paid"
    earning.paid_at = datetime.now(timezone.utc)
    db.commit()
    return {"success": True, "id": earning_id, "status": "paid"}


@router.post("/finance/earnings/bulk-pay", dependencies=[Depends(verify_admin)])
async def bulk_mark_earnings_paid(
    body: dict,
    db: Session = Depends(get_db),
):
    """Mark multiple earnings as paid at once. Body: {"earning_ids": [1, 2, 3]}"""
    ids = body.get("earning_ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No earning IDs provided")
    now = datetime.now(timezone.utc)
    updated = 0
    for eid in ids:
        earning = db.query(ReferralEarning).filter(ReferralEarning.id == eid).first()
        if earning and earning.status != "paid":
            earning.status = "paid"
            earning.paid_at = now
            updated += 1
    db.commit()
    return {"success": True, "updated": updated}


# ---------------------------------------------------------------------------
# VIP Access management
# ---------------------------------------------------------------------------

@router.get("/vip-packages", dependencies=[Depends(verify_admin)])
async def list_all_vip_packages(db: Session = Depends(get_db)):
    """Return all VIP packages (active + inactive) for admin management."""
    import json
    packages = db.query(Package).filter(Package.package_type == "vip").order_by(Package.price).all()
    result = []
    for p in packages:
        result.append({
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "currency": p.currency,
            "duration_days": p.duration_days,
            "description": p.description,
            "features": json.loads(p.features) if p.features else [],
            "is_active": p.is_active,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return result


@router.patch("/vip-packages/{package_id}", dependencies=[Depends(verify_admin)])
async def update_vip_package(
    package_id: int,
    body: dict,
    db: Session = Depends(get_db),
):
    """Update a VIP package's price, name, or active status."""
    import json
    pkg = db.query(Package).filter(Package.id == package_id, Package.package_type == "vip").first()
    if not pkg:
        raise HTTPException(status_code=404, detail="VIP package not found")
    if "name" in body:
        pkg.name = body["name"]
    if "price" in body:
        pkg.price = float(body["price"])
    if "description" in body:
        pkg.description = body["description"]
    if "features" in body:
        pkg.features = json.dumps(body["features"]) if isinstance(body["features"], list) else body["features"]
    if "is_active" in body:
        pkg.is_active = bool(body["is_active"])
    db.commit()
    return {"success": True, "id": pkg.id, "name": pkg.name, "price": pkg.price, "is_active": pkg.is_active}


@router.get("/packages", dependencies=[Depends(verify_admin)])
async def list_all_packages(db: Session = Depends(get_db)):
    """Return all pick-credit (Value Pack) packages for admin management."""
    packages = (
        db.query(Package)
        .filter(Package.package_type == "credits")
        .order_by(Package.price)
        .all()
    )
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "picks_count": p.picks_count,
            "currency": p.currency,
            "is_active": p.is_active,
            "description": p.description,
        }
        for p in packages
    ]


@router.patch("/packages/{package_id}", dependencies=[Depends(verify_admin)])
async def update_package(
    package_id: int,
    body: dict,
    db: Session = Depends(get_db),
):
    """Update a Value Pack package price, picks_count, name, or active status."""
    pkg = db.query(Package).filter(Package.id == package_id, Package.package_type == "credits").first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    if "price" in body:
        pkg.price = float(body["price"])
    if "picks_count" in body:
        pkg.picks_count = int(body["picks_count"])
    if "name" in body:
        pkg.name = str(body["name"])
    if "is_active" in body:
        pkg.is_active = bool(body["is_active"])
    if "description" in body:
        pkg.description = str(body["description"])
    db.commit()
    return {"success": True, "id": pkg.id, "name": pkg.name, "price": pkg.price, "picks_count": pkg.picks_count, "is_active": pkg.is_active}


@router.get("/vip-access", dependencies=[Depends(verify_admin)])
async def list_vip_access(db: Session = Depends(get_db)):
    """Return all VIP access records (active and expired) for admin oversight."""
    from sqlalchemy import desc
    records = (
        db.query(UserVipAccess)
        .order_by(desc(UserVipAccess.created_at))
        .limit(200)
        .all()
    )
    result = []
    for r in records:
        user = db.query(User).filter(User.id == r.user_id).first()
        pkg = db.query(Package).filter(Package.id == r.package_id).first()
        now = datetime.utcnow()
        result.append({
            "id": r.id,
            "user_email": user.email if user else r.user_id,
            "package_name": pkg.name if pkg else "Unknown",
            "duration_days": pkg.duration_days if pkg else None,
            "starts_at": r.starts_at.isoformat() if r.starts_at else None,
            "expires_at": r.expires_at.isoformat() if r.expires_at else None,
            "is_active": r.expires_at > now if r.expires_at else False,
            "reference": r.reference,
        })
    return result

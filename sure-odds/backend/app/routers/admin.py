from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import date, timedelta, datetime, timezone
from typing import List, Optional
from app.core.database import get_db
from app.models.models import User, Fixture, Prediction, Bundle, PartnerApplication
from app.services.fixtures_service import (
    update_all_fixtures,
    fetch_upcoming,
    fetch_results,
    get_api_status,
    get_current_season,
    get_daily_request_count,
    MAX_DAILY_REQUESTS,
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
    """
    email_ok = body.email.strip().lower() == settings.ADMIN_EMAIL.strip().lower()
    password_ok = bool(settings.ADMIN_PASSWORD) and body.password == settings.ADMIN_PASSWORD
    if not (email_ok and password_ok):
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
        "api_key_configured": bool(
            settings.FOOTBALL_DATA_API_KEY or settings.API_FOOTBALL_KEY
        ),
        "environment": settings.ENVIRONMENT,
        "current_season": get_current_season(),
        "data_source": "football-data.org",
    }


@router.get("/api-status", dependencies=[Depends(verify_admin)])
async def admin_api_status():
    """
    Check Football-Data.org API status: key configured, daily call budget,
    and current season. No live API call is made — reads from the in-memory
    daily counter only.
    """
    status = await get_api_status()
    return {
        "season": get_current_season(),
        "api_key_set": bool(
            settings.FOOTBALL_DATA_API_KEY or settings.API_FOOTBALL_KEY
        ),
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
async def approve_partner(app_id: str, db: Session = Depends(get_db)):
    """Approve a partner application and link the corresponding user account."""
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
    return {"success": True, "id": app_id, "status": "approved", "user_linked": app.user_id is not None}


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

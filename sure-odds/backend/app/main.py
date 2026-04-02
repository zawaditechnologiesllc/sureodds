import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import date, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import cast, Date

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models.models import Fixture, Prediction
from app.routers import (
    predictions, results, users, referrals, admin, paystack, packages,
    fixtures as fixtures_router,
    partners as partners_router,
    intasend as intasend_router,
    partner_dashboard as partner_dashboard_router,
)
from app.routers import bundles as bundles_router
from app.models.models import Package, UserVipAccess
from app.services.fixtures_service import (
    fetch_window,
    fetch_live,
    get_current_season,
    get_api_status,
)
from app.services.results_service import update_results
from app.services.prediction_engine import generate_prediction

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


# ---------------------------------------------------------------------------
# Prediction helper — generate predictions for all upcoming unpredicted fixtures
# ---------------------------------------------------------------------------

async def _generate_predictions_for_window(db, days_ahead: int = 7) -> int:
    """
    Generate predictions for every scheduled fixture in the next `days_ahead`
    days that does not already have a prediction. DB-only — zero API calls.
    """
    today = date.today()
    window = [today + timedelta(days=i) for i in range(days_ahead + 1)]

    fixtures_todo = (
        db.query(Fixture)
        .filter(
            cast(Fixture.kickoff, Date).in_(window),
            Fixture.status == "scheduled",
        )
        .filter(~Fixture.id.in_(db.query(Prediction.fixture_id)))
        .all()
    )

    created = 0
    for fixture in fixtures_todo:
        try:
            probs = await generate_prediction(
                fixture.home_team_id,
                fixture.away_team_id,
                fixture.league_id,
                fixture.season,
                db=db,
            )
            db.add(Prediction(fixture_id=fixture.id, **probs))
            created += 1
        except Exception as e:
            logger.warning(f"Prediction failed for fixture {fixture.id}: {e}")

    db.commit()
    return created


# ---------------------------------------------------------------------------
# 6-hour poll — one API call, DB update, predictions, result reconciliation
# ---------------------------------------------------------------------------

async def run_poll():
    """
    Runs every 2 hours — scrapes Sofascore for a 7-day window,
    generates predictions for new fixtures, and reconciles results.
    """
    db = SessionLocal()
    try:
        logger.info("Poll: starting Sofascore fixture refresh...")

        result = await fetch_window(db, days_back=7, days_ahead=7)
        logger.info(f"Poll: fetch result — {result}")

        created = await _generate_predictions_for_window(db, days_ahead=7)
        if created:
            logger.info(f"Poll: {created} new predictions generated.")

        reconciled = await update_results(db, days_back=7)
        if reconciled.get("updated"):
            logger.info(f"Poll: reconciled {reconciled['updated']} results.")

    except Exception as e:
        logger.error(f"Poll error: {e}", exc_info=True)
    finally:
        db.close()


async def run_live_update():
    """Runs every 2 minutes — updates scores for currently live matches."""
    db = SessionLocal()
    try:
        result = await fetch_live(db)
        if result.get("live", 0):
            logger.info(f"Live update: {result}")
    except Exception as e:
        logger.error(f"Live update error: {e}", exc_info=True)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Schema guard — add missing columns / tables directly via SQL
# Runs before seed_packages so the ORM never queries a column that doesn't exist.
# PostgreSQL's IF NOT EXISTS / ADD COLUMN IF NOT EXISTS make every statement idempotent.
# ---------------------------------------------------------------------------

def ensure_schema(db):
    from sqlalchemy import text

    statements = [
        # fixtures — odds columns from Sofascore
        "ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS home_odds FLOAT",
        "ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS draw_odds FLOAT",
        "ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS away_odds FLOAT",

        # packages — newer columns added after the initial migration
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS package_type   VARCHAR DEFAULT 'credits'",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS duration_days  INTEGER",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS description    TEXT",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS features       TEXT",

        # user_vip_access
        """
        CREATE TABLE IF NOT EXISTS user_vip_access (
            id          SERIAL PRIMARY KEY,
            user_id     VARCHAR NOT NULL REFERENCES users(id),
            package_id  INTEGER REFERENCES packages(id),
            starts_at   TIMESTAMPTZ DEFAULT NOW(),
            expires_at  TIMESTAMPTZ NOT NULL,
            reference   VARCHAR,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        )
        """,

        # bundles
        """
        CREATE TABLE IF NOT EXISTS bundles (
            id         VARCHAR PRIMARY KEY,
            name       VARCHAR NOT NULL,
            total_odds FLOAT NOT NULL,
            picks      TEXT NOT NULL,
            tier       VARCHAR NOT NULL,
            price      FLOAT NOT NULL,
            currency   VARCHAR DEFAULT 'USD',
            is_active  BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ
        )
        """,

        # bundle_purchases
        """
        CREATE TABLE IF NOT EXISTS bundle_purchases (
            id          SERIAL PRIMARY KEY,
            bundle_id   VARCHAR NOT NULL REFERENCES bundles(id),
            user_id     VARCHAR NOT NULL REFERENCES users(id),
            reference   VARCHAR NOT NULL UNIQUE,
            amount      FLOAT NOT NULL,
            status      VARCHAR DEFAULT 'pending',
            created_at  TIMESTAMPTZ DEFAULT NOW(),
            verified_at TIMESTAMPTZ
        )
        """,

        # partner_applications
        """
        CREATE TABLE IF NOT EXISTS partner_applications (
            id           VARCHAR PRIMARY KEY,
            name         VARCHAR NOT NULL,
            email        VARCHAR NOT NULL,
            platform     VARCHAR NOT NULL,
            handle       VARCHAR NOT NULL,
            followers    VARCHAR NOT NULL,
            website      VARCHAR,
            why          TEXT NOT NULL,
            status       VARCHAR DEFAULT 'pending',
            notes        TEXT,
            submitted_at TIMESTAMPTZ DEFAULT NOW(),
            reviewed_at  TIMESTAMPTZ,
            user_id      VARCHAR REFERENCES users(id)
        )
        """,

        # partner_payout_settings
        """
        CREATE TABLE IF NOT EXISTS partner_payout_settings (
            id                  SERIAL PRIMARY KEY,
            user_id             VARCHAR NOT NULL UNIQUE REFERENCES users(id),
            method              VARCHAR NOT NULL DEFAULT 'usdt',
            usdt_address        VARCHAR,
            bank_name           VARCHAR,
            bank_account_number VARCHAR,
            bank_account_name   VARCHAR,
            bank_swift          VARCHAR,
            bank_country        VARCHAR,
            created_at          TIMESTAMPTZ DEFAULT NOW(),
            updated_at          TIMESTAMPTZ
        )
        """,

        # referral_clicks
        """
        CREATE TABLE IF NOT EXISTS referral_clicks (
            id            SERIAL PRIMARY KEY,
            referral_code VARCHAR NOT NULL,
            ip_hash       VARCHAR,
            converted     BOOLEAN DEFAULT FALSE,
            created_at    TIMESTAMPTZ DEFAULT NOW()
        )
        """,

        # notifications
        """
        CREATE TABLE IF NOT EXISTS notifications (
            id         SERIAL PRIMARY KEY,
            title      VARCHAR NOT NULL,
            message    TEXT NOT NULL,
            target     VARCHAR NOT NULL DEFAULT 'all',
            is_active  BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """,
    ]

    for stmt in statements:
        try:
            db.execute(text(stmt))
        except Exception as e:
            logger.warning(f"ensure_schema: statement skipped — {e}")
            db.rollback()
    db.commit()
    logger.info("ensure_schema: schema check complete.")


# ---------------------------------------------------------------------------
# Package seeder
# ---------------------------------------------------------------------------

def seed_packages(db):
    """Ensure pick + VIP packages exist in the database."""
    import json
    credits_defaults = [
        {"id": 1, "name": "Starter Pack — 5 Picks",  "price": 2.99, "picks_count": 5,  "currency": "USD", "package_type": "credits"},
        {"id": 2, "name": "Value Pack — 10 Picks",   "price": 4.99, "picks_count": 10, "currency": "USD", "package_type": "credits"},
        {"id": 3, "name": "Pro Pack — 20 Picks",     "price": 8.99, "picks_count": 20, "currency": "USD", "package_type": "credits"},
    ]
    vip_defaults = [
        {
            "id": 4,
            "name": "Daily VIP Tips",
            "price": 200,
            "picks_count": 0,
            "currency": "KES",
            "package_type": "vip",
            "duration_days": 1,
            "description": "Full access to today's premium VIP tips",
            "features": json.dumps(["Today's premium selections", "Full probability breakdown", "Ideal for short-term access"]),
        },
        {
            "id": 5,
            "name": "Weekly VIP Access",
            "price": 625,
            "picks_count": 0,
            "currency": "KES",
            "package_type": "vip",
            "duration_days": 7,
            "description": "7 days of daily VIP tips",
            "features": json.dumps(["Higher volume opportunities", "Full probability breakdown", "Best value — save 30%"]),
        },
        {
            "id": 6,
            "name": "Monthly VIP Access",
            "price": 1500,
            "picks_count": 0,
            "currency": "KES",
            "package_type": "vip",
            "duration_days": 30,
            "description": "Full access to daily VIP tips for a full month",
            "features": json.dumps(["Full access to daily VIP tips full month", "Best for serious bettors", "Consistent long-term plan"]),
        },
    ]
    for pkg_data in credits_defaults:
        existing = db.query(Package).filter(Package.id == pkg_data["id"]).first()
        if existing:
            existing.name         = pkg_data["name"]
            existing.price        = pkg_data["price"]
            existing.picks_count  = pkg_data["picks_count"]
            existing.currency     = pkg_data["currency"]
            existing.package_type = "credits"
        else:
            db.add(Package(**pkg_data))
    for pkg_data in vip_defaults:
        existing = db.query(Package).filter(Package.id == pkg_data["id"]).first()
        if existing:
            existing.name          = pkg_data["name"]
            existing.price         = pkg_data["price"]
            existing.currency      = pkg_data["currency"]
            existing.package_type  = "vip"
            existing.duration_days = pkg_data["duration_days"]
            existing.description   = pkg_data["description"]
            existing.features      = pkg_data["features"]
        else:
            db.add(Package(**pkg_data))
    db.commit()


# ---------------------------------------------------------------------------
# Startup pipeline — wide initial fetch on first deploy
# ---------------------------------------------------------------------------

async def run_startup_pipeline():
    """
    On startup:
      1. Wide fetch: 30 days back + 14 days ahead — 1 API call.
         30 days back gives the prediction engine H2H/form history.
         14 days ahead captures fixtures past any international break.
      2. Generate predictions for all fetched upcoming fixtures.
      3. Reconcile any already-finished results (7-day window).
    """
    db = SessionLocal()
    try:
        season = get_current_season()
        logger.info(f"Sure Odds starting — detected season: {season}")

        logger.info("Startup: scraping Sofascore (30d back + 14d ahead)...")
        result = await fetch_window(db, days_back=30, days_ahead=14)
        logger.info(f"Startup: fetch complete — {result}")

        # Generate predictions for all upcoming fixtures now in DB
        logger.info("Startup: generating predictions (14-day window)...")
        created = await _generate_predictions_for_window(db, days_ahead=14)
        logger.info(f"Startup: {created} predictions created.")

        # Reconcile any already-finished matches (7-day window)
        logger.info("Startup: reconciling results (7d back)...")
        reconciled = await update_results(db, days_back=7)
        logger.info(f"Startup: {reconciled}")

    except Exception as e:
        logger.error(f"Startup pipeline error: {e}", exc_info=True)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Application lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    if settings.ENVIRONMENT == "production":
        settings.validate_production()

    _db = SessionLocal()
    try:
        ensure_schema(_db)
        seed_packages(_db)
    finally:
        _db.close()

    # Run the startup pipeline as a background task so the HTTP server starts
    # immediately and passes Render / deployment health checks.
    # The scraper (44+ HTTP requests to Sofascore) takes several minutes —
    # if it were awaited here, Render would time out and mark the deploy as failed.
    asyncio.create_task(run_startup_pipeline())
    logger.info("Startup pipeline launched in background — server accepting requests now.")

    # Fixture refresh every 2 hours
    scheduler.add_job(run_poll, "interval", hours=2, id="poll_2h", replace_existing=True)
    # Live score update every 2 minutes
    scheduler.add_job(run_live_update, "interval", minutes=2, id="live_2m", replace_existing=True)

    scheduler.start()
    logger.info("Scheduler started — Sofascore fixtures every 2 h, live scores every 2 min.")

    yield

    scheduler.shutdown()
    logger.info("Scheduler stopped.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Sure Odds API",
    description="Sports prediction SaaS backend",
    version="4.1.0",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fixtures_router.router)
app.include_router(predictions.router)
app.include_router(results.router)
app.include_router(users.router)
app.include_router(referrals.router)
app.include_router(admin.router)
app.include_router(paystack.router)
app.include_router(packages.router)
app.include_router(bundles_router.router)
app.include_router(partners_router.router)
app.include_router(intasend_router.router)
app.include_router(partner_dashboard_router.router)


@app.get("/stats")
async def public_stats():
    """Public endpoint returning platform statistics for the homepage."""
    db = SessionLocal()
    try:
        from app.models.models import User as UserModel, Prediction as PredictionModel
        total_predictions = db.query(PredictionModel).count()
        total_users = db.query(UserModel).count()
        return {
            "total_predictions": total_predictions,
            "total_users": total_users,
        }
    finally:
        db.close()


@app.get("/health")
async def health():
    status = await get_api_status()
    return {
        "status": "ok",
        "service": "sure-odds-api",
        "version": "4.1.0",
        "season": get_current_season(),
        "data_source": "sofascore.com",
        "api": status,
    }


@app.get("/")
async def root():
    return {"message": "Sure Odds API", "docs": "/docs"}

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import cast, Date, func

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
from app.routers.currency import router as currency_router
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

_SERVER_START_TIME = time.time()

# How long since the last fixture was inserted before we consider data stale.
# If data is fresher than this, the startup scrape is skipped entirely.
_SCRAPE_FRESHNESS_HOURS = 6


# ---------------------------------------------------------------------------
# Freshness check — avoid burning ScraperAPI credits on every cold start
# ---------------------------------------------------------------------------

def _hours_since_last_scrape(db) -> float | None:
    """
    Return how many hours ago the most recent fixture was created/updated.
    Returns None if the fixtures table is empty (fresh deploy).
    """
    result = db.execute(
        __import__("sqlalchemy").text(
            "SELECT MAX(created_at) FROM fixtures"
        )
    ).scalar()

    if result is None:
        return None  # No data at all — needs full scrape

    if result.tzinfo is None:
        result = result.replace(tzinfo=timezone.utc)

    delta = datetime.now(tz=timezone.utc) - result
    return delta.total_seconds() / 3600


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
                fixture=fixture,
            )
            db.add(Prediction(fixture_id=fixture.id, **probs))
            created += 1
        except Exception as e:
            logger.warning(f"Prediction failed for fixture {fixture.id}: {e}")

    db.commit()
    return created


# ---------------------------------------------------------------------------
# 6-hour poll — DB update, predictions, result reconciliation
# ---------------------------------------------------------------------------

async def run_poll():
    """
    Runs every 6 hours — scrapes Sofascore for a 7-day rolling window,
    generates predictions for new fixtures, and reconciles results.
    Uses ScraperAPI credits only during this scheduled window, not on
    every cold start.
    """
    db = SessionLocal()
    try:
        logger.info("Poll: starting Sofascore fixture refresh (6-hour schedule)...")

        result = await fetch_window(db, days_back=2, days_ahead=7)
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
    """Runs every 5 minutes — updates scores for currently live matches.
    Uses direct Sofascore requests (no ScraperAPI proxy), so no credits consumed."""
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

        # predictions — v2 engine fields (xG and market blend flag)
        "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS home_xg FLOAT",
        "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS away_xg FLOAT",
        "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS market_blended BOOLEAN DEFAULT FALSE",
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
# Startup pipeline — smart: skips full scrape when DB has fresh data
# ---------------------------------------------------------------------------

async def run_startup_pipeline():
    """
    Smart startup:
      - If DB has fixtures created within the last 6 hours → skip scraping
        entirely. Data is fresh; the 6-hour scheduler will handle updates.
      - If DB has some data but it's older than 6 hours → do a light refresh
        (3 days back + 7 ahead = 10 API calls instead of 44).
      - If DB is empty (first deploy) → do the full wide fetch (30d back +
        14d ahead) so the prediction engine has enough H2H history.

    This prevents ScraperAPI credits from being burned on every Render cold
    start and ensures the API is responsive immediately (data already in DB).
    """
    db = SessionLocal()
    try:
        season = get_current_season()
        logger.info(f"Sure Odds starting — detected season: {season}")

        hours_old = _hours_since_last_scrape(db)

        if hours_old is not None and hours_old < _SCRAPE_FRESHNESS_HOURS:
            # Data is fresh — skip scraping, just ensure predictions exist
            logger.info(
                f"Startup: DB data is {hours_old:.1f}h old (< {_SCRAPE_FRESHNESS_HOURS}h threshold). "
                "Skipping scrape — using existing DB data."
            )
            created = await _generate_predictions_for_window(db, days_ahead=7)
            if created:
                logger.info(f"Startup: {created} predictions generated for unpredicted fixtures.")
            return

        if hours_old is not None:
            # Data exists but is stale — light refresh (saves ~75% of API credits)
            logger.info(
                f"Startup: DB data is {hours_old:.1f}h old. "
                "Running light refresh (3d back + 7d ahead)..."
            )
            result = await fetch_window(db, days_back=3, days_ahead=7)
            logger.info(f"Startup: light refresh complete — {result}")
        else:
            # No data at all — first deploy, do the full wide fetch
            logger.info("Startup: DB is empty. Running full scrape (30d back + 14d ahead)...")
            result = await fetch_window(db, days_back=30, days_ahead=14)
            logger.info(f"Startup: full scrape complete — {result}")

        created = await _generate_predictions_for_window(db, days_ahead=14)
        logger.info(f"Startup: {created} predictions created.")

        reconciled = await update_results(db, days_back=7)
        logger.info(f"Startup: result reconciliation — {reconciled}")

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
    asyncio.create_task(run_startup_pipeline())
    logger.info("Startup pipeline launched in background — server accepting requests now.")

    # Fixture refresh every 6 hours — controlled cadence to preserve ScraperAPI credits.
    # Data served to the frontend always comes from the DB, never scraped per-request.
    scheduler.add_job(run_poll, "interval", hours=6, id="poll_6h", replace_existing=True)

    # Live score update every 5 minutes — direct Sofascore request, no proxy credits used.
    scheduler.add_job(run_live_update, "interval", minutes=5, id="live_5m", replace_existing=True)

    scheduler.start()
    logger.info("Scheduler started — fixture poll every 6h, live scores every 5 min.")

    yield

    scheduler.shutdown()
    logger.info("Scheduler stopped.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Sure Odds API",
    description="Sports prediction SaaS backend",
    version="4.2.0",
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
app.include_router(currency_router)


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


@app.get("/ping")
async def ping():
    """
    Lightweight keep-alive endpoint — no DB calls, instant response.
    Intended for UptimeRobot / external monitors to prevent Render
    free-tier cold starts. Ping this every 5 minutes.
    """
    uptime_seconds = int(time.time() - _SERVER_START_TIME)
    hours, remainder = divmod(uptime_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return {
        "status": "ok",
        "uptime": f"{hours}h {minutes}m {seconds}s",
    }


@app.get("/health")
async def health():
    """
    Full health check for Render deployment verification.
    Includes DB freshness and API status — configure this as
    Render's health check path in the dashboard.
    """
    db_ok = True
    data_freshness = "unknown"
    db = SessionLocal()
    try:
        hours_old = _hours_since_last_scrape(db)
        data_freshness = f"{hours_old:.1f}h ago" if hours_old is not None else "no data"
    except Exception:
        db_ok = False
    finally:
        db.close()

    status = await get_api_status()
    uptime_seconds = int(time.time() - _SERVER_START_TIME)
    hours, remainder = divmod(uptime_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)

    return {
        "status": "ok" if db_ok else "degraded",
        "service": "sure-odds-api",
        "version": "4.2.0",
        "uptime": f"{hours}h {minutes}m {seconds}s",
        "season": get_current_season(),
        "db": "ok" if db_ok else "error",
        "data_source": "sofascore.com (db-cached)",
        "data_freshness": data_freshness,
        "poll_interval_hours": 6,
        "api": status,
    }


@app.get("/")
async def root():
    return {"message": "Sure Odds API", "docs": "/docs"}

import logging
from contextlib import asynccontextmanager
from datetime import date, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import cast, Date

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models.models import Fixture, Prediction
from app.routers import (
    predictions, results, users, referrals, admin, paystack, packages,
    fixtures as fixtures_router,
)
from app.models.models import Package
from app.services.fixtures_service import (
    update_all_fixtures,
    fetch_upcoming,
    fetch_results,
    get_current_season,
    get_api_status,
)
from app.services.results_service import update_results
from app.services.prediction_engine import generate_prediction

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


# ---------------------------------------------------------------------------
# Scheduled jobs  (run at 08:00 UTC and 20:00 UTC only)
# ---------------------------------------------------------------------------

async def run_scheduled_fetch():
    """
    Main data pipeline — runs at 08:00 UTC and 20:00 UTC.
    Total: 2 API calls per run, 4 per day (well within 10-call free limit).

    Steps:
      1. Fetch today + next 3 days (upcoming fixtures)   — 1 API call
      2. Fetch past 5 days (finished matches / results)  — 1 API call
      3. Reconcile predictions against DB results         — 0 API calls
    """
    db = SessionLocal()
    try:
        logger.info("Scheduled fetch: starting...")

        # Step 1: upcoming matches
        upcoming = await fetch_upcoming(db, days_ahead=3)
        logger.info(f"Scheduled fetch: upcoming — {upcoming}")

        # Step 2: past results
        past = await fetch_results(db, days_back=5)
        logger.info(f"Scheduled fetch: past results — {past}")

        # Step 3: reconcile predictions (reads DB only)
        reconciled = await update_results(db, days_back=5)
        logger.info(f"Scheduled fetch: prediction reconcile — {reconciled}")

    except Exception as e:
        logger.error(f"Scheduled fetch error: {e}", exc_info=True)
    finally:
        db.close()


async def run_daily_predictions():
    """
    Daily at 06:00 UTC: generate predictions for today and next 3 days.
    Uses DB data only — zero API calls.
    """
    db = SessionLocal()
    try:
        logger.info("Scheduler: generating daily predictions...")
        today = date.today()
        upcoming_dates = [today + timedelta(days=i) for i in range(4)]

        fixtures_todo = (
            db.query(Fixture)
            .filter(
                cast(Fixture.kickoff, Date).in_(upcoming_dates),
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
        logger.info(f"Scheduler: {created} predictions created.")
    except Exception as e:
        logger.error(f"Scheduler: prediction error: {e}", exc_info=True)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Package seeder
# ---------------------------------------------------------------------------

def seed_packages(db):
    """Ensure the 3 pick packages exist in the database (pay-as-you-go credits)."""
    defaults = [
        {"id": 1, "name": "Starter Pack — 5 Picks",  "price": 0.20, "picks_count": 5},
        {"id": 2, "name": "Value Pack — 10 Picks",   "price": 0.70, "picks_count": 10},
        {"id": 3, "name": "Pro Pack — 20 Picks",     "price": 1.50, "picks_count": 20},
    ]
    for pkg_data in defaults:
        existing = db.query(Package).filter(Package.id == pkg_data["id"]).first()
        if existing:
            existing.name        = pkg_data["name"]
            existing.price       = pkg_data["price"]
            existing.picks_count = pkg_data["picks_count"]
            existing.currency    = "USD"
        else:
            db.add(Package(**pkg_data, currency="USD"))
    db.commit()


# ---------------------------------------------------------------------------
# Startup pipeline
# ---------------------------------------------------------------------------

async def run_startup_pipeline():
    """
    On startup:
      1. Run a full data refresh (past 5 days + today + next 3 days) — 2 API calls.
      2. Generate predictions for today and upcoming 3 days — 0 API calls.
      3. Reconcile any already-finished results — 0 API calls.
    """
    db = SessionLocal()
    try:
        season = get_current_season()
        logger.info(f"Sure Odds starting — detected season: {season}")

        key_configured = bool(settings.FOOTBALL_DATA_API_KEY or settings.API_FOOTBALL_KEY)
        if not key_configured:
            logger.warning(
                "FOOTBALL_DATA_API_KEY is not set. "
                "Fixture fetching will be skipped until the key is configured."
            )

        # Run the full fetch
        logger.info("Startup: fetching fixtures from Football-Data.org...")
        result = await update_all_fixtures(db)
        logger.info(f"Startup: fetch complete — {result}")

        # Generate predictions (DB only — no API)
        logger.info("Startup: generating predictions...")
        today = date.today()
        upcoming_dates = [today + timedelta(days=i) for i in range(4)]

        fixtures_todo = (
            db.query(Fixture)
            .filter(
                cast(Fixture.kickoff, Date).in_(upcoming_dates),
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
        logger.info(f"Startup: {created} predictions created.")

        # Reconcile results
        logger.info("Startup: reconciling results...")
        reconciled = await update_results(db, days_back=5)
        logger.info(f"Startup: results — {reconciled}")

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
        seed_packages(_db)
    finally:
        _db.close()

    await run_startup_pipeline()

    # ---- Scheduler: 2 data fetches per day ----
    # Morning fetch: 08:00 UTC
    scheduler.add_job(
        run_scheduled_fetch, "cron", hour=8, minute=0,
        id="morning_fetch", replace_existing=True,
    )
    # Evening fetch: 20:00 UTC
    scheduler.add_job(
        run_scheduled_fetch, "cron", hour=20, minute=0,
        id="evening_fetch", replace_existing=True,
    )
    # Daily predictions: 06:00 UTC (before morning fetch so predictions are ready)
    scheduler.add_job(
        run_daily_predictions, "cron", hour=6, minute=0,
        id="daily_predictions", replace_existing=True,
    )

    scheduler.start()
    logger.info(
        "Scheduler started — "
        "data fetches at 08:00 UTC and 20:00 UTC | "
        "predictions generated at 06:00 UTC | "
        "source: football-data.org"
    )

    yield

    scheduler.shutdown()
    logger.info("Scheduler stopped.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Sure Odds API",
    description="Sports prediction SaaS backend",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
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


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "sure-odds-api",
        "version": "3.0.0",
        "season": get_current_season(),
        "data_source": "football-data.org",
    }


@app.get("/")
async def root():
    return {"message": "Sure Odds API", "docs": "/docs"}

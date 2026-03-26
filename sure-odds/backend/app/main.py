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
    update_all_fixtures, fetch_today, fetch_upcoming, get_api_status,
    get_current_season,
)
from app.services.results_service import update_results
from app.services.prediction_engine import generate_prediction

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


# ---------------------------------------------------------------------------
# Scheduled jobs
# ---------------------------------------------------------------------------

async def run_thirty_min_refresh():
    """
    Every 30 minutes: fetch today's fixtures across all tracked leagues.
    Costs 1–2 API calls. Skipped if budget is exhausted or account suspended.
    """
    db = SessionLocal()
    try:
        budget = await get_api_status()
        if budget.get("suspended") or budget.get("remaining", 0) <= 2:
            logger.warning(
                f"Scheduler: 30-min skipped — "
                f"API budget={budget.get('remaining', 0)} suspended={budget.get('suspended')}"
            )
            return
        logger.info("Scheduler: 30-min fixture refresh...")
        result = await fetch_today(db)
        logger.info(f"Scheduler: 30-min done — {result}")
    except Exception as e:
        logger.error(f"Scheduler: 30-min refresh error: {e}", exc_info=True)
    finally:
        db.close()


async def run_daily_upcoming():
    """
    Daily at 00:05 UTC: fetch next 7 days of upcoming fixtures.
    Costs 7 API calls. Ensures new fixtures (re-scheduled matches, cup draws)
    are populated well in advance.
    """
    db = SessionLocal()
    try:
        logger.info("Scheduler: daily upcoming fixtures fetch...")
        result = await fetch_upcoming(db, days_ahead=7)
        logger.info(f"Scheduler: daily upcoming done — {result}")
    except Exception as e:
        logger.error(f"Scheduler: daily upcoming error: {e}", exc_info=True)
    finally:
        db.close()


async def run_daily_predictions():
    """Daily at 06:00 UTC: generate predictions for today and tomorrow."""
    db = SessionLocal()
    try:
        logger.info("Scheduler: generating daily predictions...")
        today = date.today()
        tomorrow = today + timedelta(days=1)

        fixtures_todo = (
            db.query(Fixture)
            .filter(
                cast(Fixture.kickoff, Date).in_([today, tomorrow]),
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


async def run_nightly_results():
    """Daily at 01:00 UTC: update results and mark prediction outcomes."""
    db = SessionLocal()
    try:
        logger.info("Scheduler: updating results (nightly job)...")
        result = await update_results(db)
        logger.info(f"Scheduler: results updated — {result}")
    except Exception as e:
        logger.error(f"Scheduler: results update error: {e}", exc_info=True)
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
      1. Check remaining API budget.
      2. If enough budget remains, run the full fixture refresh (11 API calls).
      3. Generate predictions for today and tomorrow.
      4. Update results for the past 3 days.
    """
    db = SessionLocal()
    try:
        season = get_current_season()
        logger.info(f"Detected season: {season}")

        # Check API budget before making calls
        budget = await get_api_status()
        logger.info(
            f"API budget: {budget['used']}/{budget['limit']} calls used today "
            f"({budget['remaining']} remaining)"
        )

        if budget["remaining"] >= 12:
            logger.info("Startup: running full fixture refresh...")
            await update_all_fixtures(db)
        else:
            logger.warning(
                f"Startup: skipping full fixture fetch — only "
                f"{budget['remaining']} API calls remaining today. "
                "Data will be refreshed on the next 30-min cycle."
            )

        # Generate predictions for today + tomorrow
        logger.info("Startup: generating predictions...")
        today = date.today()
        tomorrow = today + timedelta(days=1)

        fixtures_todo = (
            db.query(Fixture)
            .filter(
                cast(Fixture.kickoff, Date).in_([today, tomorrow]),
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
                )
                db.add(Prediction(fixture_id=fixture.id, **probs))
                created += 1
            except Exception as e:
                logger.warning(f"Prediction failed for fixture {fixture.id}: {e}")

        db.commit()
        logger.info(f"Startup: {created} predictions created.")

        # Update results for recently finished matches (skip when suspended)
        if not budget.get("suspended") and budget.get("remaining", 0) > 3:
            logger.info("Startup: reconciling results...")
            result = await update_results(db)
            logger.info(f"Startup: results — {result}")
        else:
            logger.info("Startup: skipping results update (API budget exhausted or suspended)")

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

    # Every 30 min: fetch today's live scores + status (1 API call)
    scheduler.add_job(
        run_thirty_min_refresh, "interval", minutes=30,
        id="thirty_min_refresh", replace_existing=True,
    )
    # Daily at 00:05 UTC: fetch upcoming week (7 API calls)
    scheduler.add_job(
        run_daily_upcoming, "cron", hour=0, minute=5,
        id="daily_upcoming", replace_existing=True,
    )
    # Daily at 06:00 UTC: generate predictions
    scheduler.add_job(
        run_daily_predictions, "cron", hour=6, minute=0,
        id="daily_predictions", replace_existing=True,
    )
    # Daily at 01:00 UTC: update match results
    scheduler.add_job(
        run_nightly_results, "cron", hour=1, minute=0,
        id="nightly_results", replace_existing=True,
    )

    scheduler.start()
    logger.info(
        "Scheduler started — "
        "fixture refresh every 30 min | "
        "upcoming fetch daily at 00:05 UTC | "
        "predictions at 06:00 UTC | "
        "results at 01:00 UTC"
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
    version="2.0.0",
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
        "version": "2.0.0",
        "season": get_current_season(),
    }


@app.get("/")
async def root():
    return {"message": "Sure Odds API", "docs": "/docs"}

import logging
from contextlib import asynccontextmanager
from datetime import date, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import func, cast, Date

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models.models import Fixture, Prediction
from app.routers import predictions, results, users, referrals, admin, paystack, packages, fixtures as fixtures_router
from app.models.models import Package
from app.services.fixtures_service import update_all_fixtures
from app.services.results_service import update_results
from app.services.prediction_engine import generate_prediction

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


async def run_fixtures_update():
    """Every 6 hours: fetch past 7 days + next 5 days of fixtures."""
    db = SessionLocal()
    try:
        logger.info("Scheduler: updating fixtures (6-hour job)...")
        result = await update_all_fixtures(db)
        logger.info(f"Scheduler: fixtures update done — {result}")
    except Exception as e:
        logger.error(f"Scheduler: fixtures update error: {e}", exc_info=True)
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
            # Update pricing if it was wrong
            existing.name = pkg_data["name"]
            existing.price = pkg_data["price"]
            existing.picks_count = pkg_data["picks_count"]
            existing.currency = "USD"
        else:
            db.add(Package(**pkg_data, currency="USD"))
    db.commit()


async def run_startup_pipeline():
    """On startup: fetch fixtures + generate predictions for today."""
    db = SessionLocal()
    try:
        logger.info("Startup: fetching fixtures...")
        await update_all_fixtures(db)

        logger.info("Startup: generating predictions for today and tomorrow...")
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

        logger.info("Startup: updating yesterday's results...")
        result = await update_results(db)
        logger.info(f"Startup: results updated — {result}")
    except Exception as e:
        logger.error(f"Startup pipeline error: {e}", exc_info=True)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    if settings.ENVIRONMENT == "production":
        settings.validate_production()

    # Seed pick packages
    _db = SessionLocal()
    try:
        seed_packages(_db)
    finally:
        _db.close()

    logger.info("Running startup data pipeline...")
    await run_startup_pipeline()

    # Every 6 hours: fetch fixtures (past 7 days + next 5 days)
    scheduler.add_job(
        run_fixtures_update, "interval", hours=6,
        id="fixtures_update", replace_existing=True
    )
    # Daily at 06:00 UTC: generate predictions
    scheduler.add_job(
        run_daily_predictions, "cron", hour=6, minute=0,
        id="daily_predictions", replace_existing=True
    )
    # Daily at 01:00 UTC: update match results
    scheduler.add_job(
        run_nightly_results, "cron", hour=1, minute=0,
        id="nightly_results", replace_existing=True
    )

    scheduler.start()
    logger.info("Scheduler started — fixtures every 6h, predictions at 06:00 UTC, results at 01:00 UTC.")

    yield

    scheduler.shutdown()
    logger.info("Scheduler stopped.")


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
    return {"status": "ok", "service": "sure-odds-api", "version": "2.0.0"}


@app.get("/")
async def root():
    return {"message": "Sure Odds API", "docs": "/docs"}

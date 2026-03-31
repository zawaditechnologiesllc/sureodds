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
from app.models.models import Package
from app.services.fixtures_service import (
    fetch_window,
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
    Runs every 6 hours (00:00, 06:00, 12:00, 18:00 UTC).
    One Football-Data.org API call covers a rolling window of
    7 days back + today + 7 days ahead, storing everything in the DB.

    Pipeline per poll:
      1. Fetch window (7d back → 7d ahead)   — 1 API call
      2. Generate predictions for new fixtures — 0 API calls (DB only)
      3. Reconcile finished match results      — 0 API calls (DB only)
    """
    db = SessionLocal()
    try:
        logger.info("Poll: starting 6-hour fixture refresh...")

        # Step 1: one API call covering past 7 days + next 7 days
        result = await fetch_window(db, days_back=7, days_ahead=7)
        logger.info(f"Poll: fetch result — {result}")

        # Step 2: generate predictions for any new upcoming fixtures
        created = await _generate_predictions_for_window(db, days_ahead=7)
        if created:
            logger.info(f"Poll: {created} new predictions generated.")

        # Step 3: reconcile results for finished matches (DB only, 7-day window)
        reconciled = await update_results(db, days_back=7)
        if reconciled.get("updated"):
            logger.info(f"Poll: reconciled {reconciled['updated']} results.")

    except Exception as e:
        logger.error(f"Poll error: {e}", exc_info=True)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Package seeder
# ---------------------------------------------------------------------------

def seed_packages(db):
    """Ensure the 3 pick packages exist in the database."""
    defaults = [
        {"id": 1, "name": "Starter Pack — 5 Picks",  "price": 2.99, "picks_count": 5},
        {"id": 2, "name": "Value Pack — 10 Picks",   "price": 4.99, "picks_count": 10},
        {"id": 3, "name": "Pro Pack — 20 Picks",     "price": 8.99, "picks_count": 20},
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

        key_configured = bool(settings.FOOTBALL_DATA_API_KEY or settings.API_FOOTBALL_KEY)
        if not key_configured:
            logger.warning(
                "FOOTBALL_DATA_API_KEY is not set — fixture fetching skipped at startup. "
                "Set FOOTBALL_DATA_API_KEY in environment secrets to enable live data."
            )
        else:
            logger.info("Startup: wide fetch (30d back + 14d ahead)...")
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
        seed_packages(_db)
    finally:
        _db.close()

    await run_startup_pipeline()

    # Poll every 6 hours — one API call per run (4 calls/day max)
    scheduler.add_job(
        run_poll,
        "interval",
        hours=6,
        id="poll_6h",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started — polling Football-Data.org every 6 hours.")

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
        "data_source": "football-data.org",
        "api": status,
    }


@app.get("/")
async def root():
    return {"message": "Sure Odds API", "docs": "/docs"}

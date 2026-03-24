import logging
from contextlib import asynccontextmanager
from datetime import date

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import func

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models.models import Fixture, Prediction
from app.routers import predictions, results, users, referrals, admin
from app.services.fixtures_service import update_all_fixtures
from app.services.results_service import update_results
from app.services.prediction_engine import generate_prediction

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


async def run_daily_pipeline():
    """Fetch fixtures → generate predictions → update yesterday's results."""
    db = SessionLocal()
    try:
        logger.info("Pipeline: updating fixtures...")
        await update_all_fixtures(db)

        logger.info("Pipeline: generating predictions for today...")
        today = date.today()
        fixtures_todo = (
            db.query(Fixture)
            .filter(func.date(Fixture.kickoff) == today, Fixture.status == "scheduled")
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
        logger.info(f"Pipeline: {created} predictions created.")

        logger.info("Pipeline: updating yesterday's results...")
        result = await update_results(db)
        logger.info(f"Pipeline: results updated — {result}")
    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    if settings.ENVIRONMENT == "production":
        settings.validate_production()

    logger.info("Running startup data pipeline...")
    await run_daily_pipeline()

    scheduler.add_job(run_daily_pipeline, "cron", hour=1, minute=0, id="daily_pipeline", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started — daily pipeline at 01:00 UTC.")

    yield

    scheduler.shutdown()
    logger.info("Scheduler stopped.")


app = FastAPI(
    title="Sure Odds API",
    description="Sports prediction SaaS backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predictions.router)
app.include_router(results.router)
app.include_router(users.router)
app.include_router(referrals.router)
app.include_router(admin.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "sure-odds-api"}


@app.get("/")
async def root():
    return {"message": "Sure Odds API", "docs": "/docs"}

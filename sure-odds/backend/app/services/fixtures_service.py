"""
Service for fetching and updating fixtures from API-Football.
Fetches past 7 days of completed matches and upcoming 5 days of fixtures.
All frontend requests must read from the database — never call API-Football from frontend.
"""

import httpx
import logging
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import Fixture, League

logger = logging.getLogger(__name__)

API_FOOTBALL_BASE = "https://v3.football.api-sports.io"

ACTIVE_LEAGUES = [
    {"id": 39, "name": "Premier League", "country": "England"},
    {"id": 140, "name": "La Liga", "country": "Spain"},
    {"id": 1644, "name": "Kenyan Premier League", "country": "Kenya"},
    {"id": 135, "name": "Serie A", "country": "Italy"},
    {"id": 78, "name": "Bundesliga", "country": "Germany"},
]

CURRENT_SEASON = 2025


async def fetch_fixtures_for_date(target_date: date, league_id: int) -> list:
    if not settings.API_FOOTBALL_KEY:
        logger.warning("API_FOOTBALL_KEY not set — skipping fetch")
        return []
    headers = {"x-apisports-key": settings.API_FOOTBALL_KEY}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{API_FOOTBALL_BASE}/fixtures",
                headers=headers,
                params={
                    "date": target_date.isoformat(),
                    "league": league_id,
                    "season": CURRENT_SEASON,
                },
                timeout=30,
            )
            data = resp.json()
            return data.get("response", [])
    except Exception as e:
        logger.error(f"Failed to fetch fixtures for {target_date} league {league_id}: {e}")
        return []


async def upsert_fixtures(db: Session, fixtures_data: list, league_id: int) -> int:
    count = 0
    for f in fixtures_data:
        try:
            fixture_id = f["fixture"]["id"]
            kickoff_str = f["fixture"]["date"]
            kickoff = datetime.fromisoformat(kickoff_str.replace("Z", "+00:00"))
            new_status = map_status(f["fixture"]["status"]["short"])

            existing = db.query(Fixture).filter(Fixture.id == fixture_id).first()
            if existing:
                # Only update status and scores — do not overwrite valid finished records
                if existing.status != "finished" or new_status == "finished":
                    existing.status = new_status
                existing.home_score = f["goals"]["home"]
                existing.away_score = f["goals"]["away"]
            else:
                fixture = Fixture(
                    id=fixture_id,
                    league_id=league_id,
                    home_team_id=f["teams"]["home"]["id"],
                    home_team_name=f["teams"]["home"]["name"],
                    home_team_logo=f["teams"]["home"].get("logo"),
                    away_team_id=f["teams"]["away"]["id"],
                    away_team_name=f["teams"]["away"]["name"],
                    away_team_logo=f["teams"]["away"].get("logo"),
                    kickoff=kickoff,
                    status=new_status,
                    home_score=f["goals"]["home"],
                    away_score=f["goals"]["away"],
                    season=CURRENT_SEASON,
                )
                db.add(fixture)
                count += 1
        except Exception as e:
            logger.warning(f"Error upserting fixture: {e}")
            continue

    db.commit()
    return count


def map_status(api_status: str) -> str:
    live_statuses = {"1H", "2H", "HT", "ET", "BT", "P", "LIVE"}
    finished_statuses = {"FT", "AET", "PEN"}
    if api_status in live_statuses:
        return "live"
    if api_status in finished_statuses:
        return "finished"
    return "scheduled"


async def ensure_leagues(db: Session):
    for league_data in ACTIVE_LEAGUES:
        existing = db.query(League).filter(League.id == league_data["id"]).first()
        if not existing:
            league = League(**league_data)
            db.add(league)
    db.commit()


async def update_all_fixtures(db: Session) -> dict:
    """
    Fetch past 7 days of completed matches + next 5 days of upcoming fixtures.
    Called every 6 hours by the scheduler.
    """
    await ensure_leagues(db)
    total = 0
    today = date.today()

    # Past 7 days (to capture completed matches and update results)
    past_dates = [today - timedelta(days=i) for i in range(1, 8)]
    # Next 5 days (upcoming fixtures)
    future_dates = [today + timedelta(days=i) for i in range(0, 6)]
    all_dates = past_dates + future_dates

    for league in ACTIVE_LEAGUES:
        for target_date in all_dates:
            fixtures = await fetch_fixtures_for_date(target_date, league["id"])
            count = await upsert_fixtures(db, fixtures, league["id"])
            total += count

    logger.info(f"Fixtures update complete: {total} new fixtures added across {len(all_dates)} dates")
    return {"fixtures_added": total, "dates_fetched": len(all_dates)}

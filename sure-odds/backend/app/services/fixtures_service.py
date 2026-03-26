"""
Service for fetching and storing fixtures from API-Football v3.
Docs: https://www.api-football.com/documentation-v3

Architecture:
  - ALL data is fetched in background jobs and served to users from the DB.
  - NEVER call API-Football on a user request — always read from DB.

Budget strategy (100 API calls/day on free plan):
  - 1 call per date fetch (all leagues in one request, filtered server-side)
  - Startup:      today + past 3 days + next 7 days = 11 calls max
  - Every 30 min: today only = 1 call  →  ≤48 calls/day
  - Daily midnight: next 7 days = 7 calls
  - Total worst-case: ~66 calls/day  ✓ well under 100
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
    {"id": 39,   "name": "Premier League",       "country": "England"},
    {"id": 140,  "name": "La Liga",               "country": "Spain"},
    {"id": 135,  "name": "Serie A",               "country": "Italy"},
    {"id": 78,   "name": "Bundesliga",            "country": "Germany"},
    {"id": 1644, "name": "Kenyan Premier League", "country": "Kenya"},
]

ACTIVE_LEAGUE_IDS = {league["id"] for league in ACTIVE_LEAGUES}


def get_current_season() -> int:
    """
    Auto-detect the current football season year.

    Per API-Football convention, the season number is the calendar year
    in which the season STARTS:
      - Season 2025 = Aug 2025 → May/Jun 2026  (European leagues)
      - Season 2024 = Aug 2024 → May/Jun 2025

    Logic:
      - Month >= 7 (July onward)  → new season just kicked off → use current year
      - Month <  7 (Jan–June)     → season started last year   → use current year - 1

    Examples (today = March 2026):  month=3 < 7  →  season = 2025  ✓
    Examples (today = August 2026): month=8 >= 7 →  season = 2026  ✓
    """
    today = date.today()
    return today.year if today.month >= 7 else today.year - 1


async def get_api_status() -> dict:
    """
    Query /status to see how many API calls have been used today.
    Returns dict with keys: used, limit, remaining, suspended.

    Note: when the account is suspended or the plan errors, the API returns
    response as [] (empty list) rather than a dict — we handle both cases.
    """
    if not settings.API_FOOTBALL_KEY:
        return {"used": 0, "limit": 100, "remaining": 0, "suspended": True}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{API_FOOTBALL_BASE}/status",
                headers={"x-apisports-key": settings.API_FOOTBALL_KEY},
            )
            data = resp.json()

        errors = data.get("errors", {})
        if errors:
            logger.warning(f"API-Football status error: {errors}")
            return {"used": 100, "limit": 100, "remaining": 0, "suspended": True, "errors": errors}

        response = data.get("response", {})
        # API returns response as a dict on success, [] on error/suspension
        if not isinstance(response, dict):
            return {"used": 100, "limit": 100, "remaining": 0, "suspended": True}

        reqs = response.get("requests", {})
        used  = reqs.get("current", 0)
        limit = reqs.get("limit_day", 100)
        subscription = response.get("subscription", {})
        plan = subscription.get("plan", "Unknown")
        logger.info(f"API-Football plan: {plan} — {used}/{limit} calls used today")
        return {
            "used": used,
            "limit": limit,
            "remaining": limit - used,
            "plan": plan,
            "suspended": False,
        }
    except Exception as e:
        logger.warning(f"Could not check API budget: {e}")
        return {"used": 0, "limit": 100, "remaining": 100, "suspended": False}


async def _fetch_raw(target_date: date, season: int | None) -> list | None:
    """
    Internal helper — makes ONE API call to /fixtures filtered by date (and
    optionally season).  Returns the filtered fixture list on success, or None
    if an API-level error was returned (so the caller can try a fallback).
    """
    headers = {"x-apisports-key": settings.API_FOOTBALL_KEY}
    params: dict = {"date": target_date.isoformat()}
    if season is not None:
        params["season"] = season

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{API_FOOTBALL_BASE}/fixtures",
                headers=headers,
                params=params,
            )
            data = resp.json()

        errors = data.get("errors", {})
        if errors:
            logger.warning(
                f"API-Football error for {target_date}"
                f"{f' season {season}' if season else ''}: {errors}"
            )
            return None  # Signal caller to try fallback

        all_fixtures = data.get("response", [])
        filtered = [
            f for f in all_fixtures
            if f.get("league", {}).get("id") in ACTIVE_LEAGUE_IDS
        ]
        logger.info(
            f"Fetched {target_date}"
            f"{f' season {season}' if season else ' (no season param)'}: "
            f"{len(filtered)} tracked-league fixtures "
            f"(out of {len(all_fixtures)} total)"
        )
        return filtered

    except Exception as e:
        logger.error(f"Failed to fetch fixtures for {target_date}: {e}")
        return None


async def fetch_fixtures_for_date(target_date: date) -> list:
    """
    Fetch ALL fixtures for a given date in a SINGLE API call.

    Strategy (per API-Football v3 docs, season is optional with date):
      1. Try with the auto-detected current season (most accurate).
      2. If the plan blocks that season, retry WITHOUT a season parameter
         so the API auto-resolves it — this works on plans that say they
         cover "all seasons".
      3. Return empty list only if both attempts fail.

    No season number is ever hardcoded here.
    """
    if not settings.API_FOOTBALL_KEY:
        logger.warning("API_FOOTBALL_KEY not set — skipping fetch")
        return []

    season = get_current_season()

    # Attempt 1: with current season
    result = await _fetch_raw(target_date, season=season)
    if result is not None:
        return result

    # Attempt 2: without season (let API determine automatically)
    logger.info(
        f"Retrying {target_date} without season param "
        f"(plan may have auto-resolve for all seasons)"
    )
    result = await _fetch_raw(target_date, season=None)
    return result if result is not None else []


async def upsert_fixtures(db: Session, fixtures_data: list) -> int:
    """
    Insert new fixtures and update scores/status for existing ones.
    Season and league_id are taken from the API response (not hardcoded).
    Returns the count of newly inserted fixtures.
    """
    count = 0
    for f in fixtures_data:
        try:
            fixture_id = f["fixture"]["id"]
            league_id  = f["league"]["id"]
            season     = f["league"]["season"]
            kickoff_str = f["fixture"]["date"]
            kickoff = datetime.fromisoformat(kickoff_str.replace("Z", "+00:00"))
            new_status = map_status(f["fixture"]["status"]["short"])

            existing = db.query(Fixture).filter(Fixture.id == fixture_id).first()
            if existing:
                if existing.status != "finished" or new_status == "finished":
                    existing.status = new_status
                existing.home_score = f["goals"]["home"]
                existing.away_score = f["goals"]["away"]
            else:
                db.add(Fixture(
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
                    season=season,
                ))
                count += 1

        except Exception as e:
            logger.warning(
                f"Error upserting fixture {f.get('fixture', {}).get('id')}: {e}"
            )
            continue

    db.commit()
    return count


def map_status(api_status: str) -> str:
    """Map API-Football short status codes to our internal status strings."""
    if api_status in {"1H", "2H", "HT", "ET", "BT", "P", "LIVE"}:
        return "live"
    if api_status in {"FT", "AET", "PEN"}:
        return "finished"
    return "scheduled"


async def ensure_leagues(db: Session):
    """Ensure all active leagues are present in the DB."""
    for league_data in ACTIVE_LEAGUES:
        if not db.query(League).filter(League.id == league_data["id"]).first():
            db.add(League(**league_data))
    db.commit()


async def fetch_today(db: Session) -> dict:
    """
    Fetch today's fixtures only. Called every 30 minutes.
    Costs exactly 1 API call.
    """
    await ensure_leagues(db)
    today = date.today()
    fixtures = await fetch_fixtures_for_date(today)
    count = await upsert_fixtures(db, fixtures)
    logger.info(f"30-min refresh complete: {count} new fixtures for {today}")
    return {"fixtures_added": count, "date": today.isoformat()}


async def fetch_upcoming(db: Session, days_ahead: int = 7) -> dict:
    """
    Fetch upcoming fixtures for the next N days (not including today).
    Called once at startup and daily at midnight.
    Costs N API calls.
    """
    await ensure_leagues(db)
    today = date.today()
    total = 0
    for i in range(1, days_ahead + 1):
        target = today + timedelta(days=i)
        fixtures = await fetch_fixtures_for_date(target)
        count = await upsert_fixtures(db, fixtures)
        total += count
    logger.info(f"Upcoming fetch: {total} new fixtures for next {days_ahead} days")
    return {"fixtures_added": total, "days_fetched": days_ahead}


async def update_all_fixtures(db: Session) -> dict:
    """
    Full refresh: past 3 days (result updates) + today + next 7 days.
    Called on startup only. Costs up to 11 API calls.
    """
    await ensure_leagues(db)
    today = date.today()
    total = 0
    past_dates   = [today - timedelta(days=i) for i in range(1, 4)]
    future_dates = [today + timedelta(days=i) for i in range(0, 8)]
    all_dates    = past_dates + future_dates

    for target_date in all_dates:
        fixtures = await fetch_fixtures_for_date(target_date)
        count    = await upsert_fixtures(db, fixtures)
        total   += count

    logger.info(
        f"Full refresh complete: {total} new fixtures across {len(all_dates)} dates"
    )
    return {"fixtures_added": total, "dates_fetched": len(all_dates)}

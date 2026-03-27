"""
Service for fetching and storing fixtures from Football-Data.org v4.
Docs: https://www.football-data.org/documentation/api

Architecture:
  - A scheduler polls Football-Data.org every 10 minutes with ONE API call.
  - Each call fetches a rolling window: 7 days back + today + 7 days ahead.
  - Endpoints serve data exclusively from the database — zero per-request calls.
  - Rate limit: Football-Data.org free plan allows 10 requests/minute.
    At one call per 10 minutes = 144 calls/day, well within the rate limit.

API budget:
  - 1 call per 10-minute run  ×  144 runs/day  =  144 calls/day
  - Rate limit guard: no more than 1 call per minute (enforced in scheduler)
  - Hard daily cap: 200 calls (safety valve, ~38% headroom)
"""

import httpx
import logging
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import Fixture, League

logger = logging.getLogger(__name__)

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"

# Football-Data.org competition codes → (league DB id, display name, country)
# These 4 European leagues are available on the free plan.
ACTIVE_COMPETITIONS = [
    {"code": "PL",  "id": 2021, "name": "Premier League", "country": "England"},
    {"code": "PD",  "id": 2014, "name": "La Liga",         "country": "Spain"},
    {"code": "SA",  "id": 2019, "name": "Serie A",         "country": "Italy"},
    {"code": "BL1", "id": 2002, "name": "Bundesliga",      "country": "Germany"},
]

COMPETITION_CODES = ",".join(c["code"] for c in ACTIVE_COMPETITIONS)
ACTIVE_COMPETITION_IDS = {c["id"] for c in ACTIVE_COMPETITIONS}

# ---------------------------------------------------------------------------
# Daily request counter  (in-memory; resets on server restart)
# ---------------------------------------------------------------------------

_daily_requests: dict[str, int] = {}

# Hard cap: 200 calls/day — safety valve only. Normal usage is ~144/day.
MAX_DAILY_REQUESTS = 200


def _record_request():
    key = date.today().isoformat()
    _daily_requests[key] = _daily_requests.get(key, 0) + 1
    logger.info(f"API request #{_daily_requests[key]} today ({key})")


def get_daily_request_count() -> int:
    return _daily_requests.get(date.today().isoformat(), 0)


def is_over_daily_limit() -> bool:
    return get_daily_request_count() >= MAX_DAILY_REQUESTS


# ---------------------------------------------------------------------------
# Season helpers
# ---------------------------------------------------------------------------

def get_current_season() -> int:
    """
    Auto-detect the current football season year.
    Month >= 7 (July onward) → season just kicked off → current year.
    Month <  7 (Jan–June)    → season started last year → year - 1.
    Example: March 2026 → season 2025
    """
    today = date.today()
    return today.year if today.month >= 7 else today.year - 1


# ---------------------------------------------------------------------------
# API status / health check
# ---------------------------------------------------------------------------

async def get_api_status() -> dict:
    key = settings.FOOTBALL_DATA_API_KEY or settings.API_FOOTBALL_KEY
    daily_used = get_daily_request_count()
    return {
        "available": bool(key) and not is_over_daily_limit(),
        "api_key_set": bool(key),
        "daily_used": daily_used,
        "daily_limit": MAX_DAILY_REQUESTS,
        "remaining": MAX_DAILY_REQUESTS - daily_used,
        "source": "football-data.org",
        "season": get_current_season(),
        "poll_interval_minutes": 10,
    }


# ---------------------------------------------------------------------------
# Core fetch helpers
# ---------------------------------------------------------------------------

def _get_headers() -> dict:
    key = settings.FOOTBALL_DATA_API_KEY or settings.API_FOOTBALL_KEY
    return {"X-Auth-Token": key}


def map_status(api_status: str) -> str:
    """Map Football-Data.org match status to our internal values."""
    if api_status in {"IN_PLAY", "PAUSED", "LIVE", "HALFTIME"}:
        return "live"
    if api_status in {"FINISHED", "AWARDED"}:
        return "finished"
    return "scheduled"


def _extract_season_year(match: dict) -> int:
    try:
        start_date_str = match.get("season", {}).get("startDate", "")
        if start_date_str:
            return int(start_date_str[:4])
    except (ValueError, TypeError):
        pass
    return get_current_season()


async def _fetch_matches_for_range(date_from: date, date_to: date) -> list | None:
    """
    ONE API call: fetch all matches between date_from and date_to for our competitions.
    Returns list of match dicts on success, empty list if no key, None on error.
    """
    if not (settings.FOOTBALL_DATA_API_KEY or settings.API_FOOTBALL_KEY):
        logger.warning("FOOTBALL_DATA_API_KEY not configured — skipping fetch.")
        return []

    if is_over_daily_limit():
        logger.warning(f"Daily limit reached ({MAX_DAILY_REQUESTS}). Skipping fetch.")
        return None

    params = {
        "dateFrom": date_from.isoformat(),
        "dateTo": date_to.isoformat(),
        "competitions": COMPETITION_CODES,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{FOOTBALL_DATA_BASE}/matches",
                headers=_get_headers(),
                params=params,
            )
            _record_request()

            if resp.status_code == 429:
                logger.error("Rate limit hit (429). Will retry next poll.")
                return None
            if resp.status_code == 403:
                logger.error("Football-Data.org 403 Forbidden — check FOOTBALL_DATA_API_KEY.")
                return None
            if resp.status_code != 200:
                logger.error(f"Football-Data.org HTTP {resp.status_code}: {resp.text[:200]}")
                return None

            data = resp.json()
            matches = data.get("matches", [])
            count = data.get("resultSet", {}).get("count", len(matches))
            logger.info(f"Fetched {date_from} → {date_to}: {count} matches")
            return matches

    except Exception as e:
        logger.error(f"Fetch error {date_from}→{date_to}: {e}")
        return None


# ---------------------------------------------------------------------------
# Upsert
# ---------------------------------------------------------------------------

async def upsert_fixtures(db: Session, matches: list) -> dict:
    """
    Insert new matches and update scores/status for existing ones.
    Returns counts of inserted and updated records.
    """
    inserted = 0
    updated = 0
    for m in matches:
        try:
            match_id    = m["id"]
            comp_id     = m["competition"]["id"]
            utc_date    = m["utcDate"]
            api_status  = m["status"]
            home        = m["homeTeam"]
            away        = m["awayTeam"]
            score       = m.get("score", {})
            full_time   = score.get("fullTime", {})
            home_score  = full_time.get("home")
            away_score  = full_time.get("away")
            season_year = _extract_season_year(m)

            kickoff = datetime.fromisoformat(utc_date.replace("Z", "+00:00"))
            status  = map_status(api_status)

            existing = db.query(Fixture).filter(Fixture.id == match_id).first()
            if existing:
                existing.status     = status
                existing.home_score = home_score
                existing.away_score = away_score
                if home.get("crest"):
                    existing.home_team_logo = home["crest"]
                if away.get("crest"):
                    existing.away_team_logo = away["crest"]
                updated += 1
            else:
                db.add(Fixture(
                    id=match_id,
                    league_id=comp_id,
                    home_team_id=home["id"],
                    home_team_name=home.get("name", home.get("shortName", "Unknown")),
                    home_team_logo=home.get("crest"),
                    away_team_id=away["id"],
                    away_team_name=away.get("name", away.get("shortName", "Unknown")),
                    away_team_logo=away.get("crest"),
                    kickoff=kickoff,
                    status=status,
                    home_score=home_score,
                    away_score=away_score,
                    season=season_year,
                ))
                inserted += 1

        except Exception as e:
            logger.warning(f"Error upserting match {m.get('id')}: {e}")
            continue

    db.commit()
    return {"inserted": inserted, "updated": updated}


# ---------------------------------------------------------------------------
# League seeding
# ---------------------------------------------------------------------------

async def ensure_leagues(db: Session):
    """Ensure all active competitions exist in the leagues table."""
    for comp in ACTIVE_COMPETITIONS:
        if not db.query(League).filter(League.id == comp["id"]).first():
            db.add(League(id=comp["id"], name=comp["name"], country=comp["country"]))
    db.commit()


# ---------------------------------------------------------------------------
# Main polling function — called every 10 minutes by the scheduler
# ---------------------------------------------------------------------------

async def fetch_window(db: Session, days_back: int = 7, days_ahead: int = 7) -> dict:
    """
    Single API call covering a rolling window: past N days + today + next N days.

    This is the primary polling function called every 10 minutes.
    One call covers both result updates (finished matches) and upcoming fixtures.

    days_back=7   — captures finished matches for results page
    days_ahead=7  — captures upcoming fixtures for predictions page
                    Use days_ahead=14 for initial boot to cover international breaks.
    """
    await ensure_leagues(db)
    today = date.today()
    date_from = today - timedelta(days=days_back)
    date_to   = today + timedelta(days=days_ahead)

    matches = await _fetch_matches_for_range(date_from, date_to)
    if matches is None:
        return {"error": "API call failed", "fixtures_inserted": 0, "fixtures_updated": 0}
    if not matches:
        return {"fixtures_inserted": 0, "fixtures_updated": 0, "skipped": True}

    counts = await upsert_fixtures(db, matches)
    finished = sum(1 for m in matches if map_status(m["status"]) == "finished")
    scheduled = sum(1 for m in matches if map_status(m["status"]) == "scheduled")

    logger.info(
        f"Window {date_from} → {date_to}: "
        f"{counts['inserted']} new, {counts['updated']} updated "
        f"({scheduled} upcoming, {finished} finished)"
    )
    return {
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "total_matches": len(matches),
        "fixtures_inserted": counts["inserted"],
        "fixtures_updated": counts["updated"],
        "upcoming": scheduled,
        "finished": finished,
    }


# ---------------------------------------------------------------------------
# Legacy functions kept for admin endpoints
# ---------------------------------------------------------------------------

async def fetch_upcoming(db: Session, days_ahead: int = 7) -> dict:
    """Fetch today + next N days. Kept for admin manual triggers."""
    return await fetch_window(db, days_back=0, days_ahead=days_ahead)


async def fetch_results(db: Session, days_back: int = 7) -> dict:
    """Fetch past N days. Kept for admin manual triggers."""
    return await fetch_window(db, days_back=days_back, days_ahead=0)


async def update_all_fixtures(db: Session, days_ahead: int = 14, days_back: int = 30) -> dict:
    """
    Wide refresh used by admin manual trigger and startup.
    Uses 1 API call (single range query).
    """
    return await fetch_window(db, days_back=days_back, days_ahead=days_ahead)

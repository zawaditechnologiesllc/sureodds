"""
Service for fetching and storing fixtures from Football-Data.org v4.
Docs: https://www.football-data.org/documentation/api

Architecture:
  - Data is fetched ONLY in scheduled background jobs (08:00 and 20:00 UTC).
  - Endpoints serve data exclusively from the database — zero per-request API calls.
  - Each scheduled run uses at most 2 API calls (upcoming + past results).
  - Maximum 4 calls/day — well within the free plan's 10 calls/day limit.

API budget strategy (free plan: 10 requests/minute, ~10 calls/day safe):
  - Morning run (08:00):  fetch today+3 days ahead  = 1 call
                          fetch past 5 days (results) = 1 call
  - Evening run (20:00):  same 2 calls
  - Total: 4 calls/day max. Hard limit: 20 calls/day.
"""

import httpx
import logging
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import Fixture, League

logger = logging.getLogger(__name__)

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"

# Football-Data.org competition codes → (league DB id, display name, country)
# Note: Kenyan Premier League is not available on Football-Data.org.
# The 4 covered European leagues are included on the free plan.
ACTIVE_COMPETITIONS = [
    {"code": "PL",  "id": 2021, "name": "Premier League", "country": "England"},
    {"code": "PD",  "id": 2014, "name": "La Liga",         "country": "Spain"},
    {"code": "SA",  "id": 2019, "name": "Serie A",         "country": "Italy"},
    {"code": "BL1", "id": 2002, "name": "Bundesliga",      "country": "Germany"},
]

# Comma-separated list used in API requests
COMPETITION_CODES = ",".join(c["code"] for c in ACTIVE_COMPETITIONS)
ACTIVE_COMPETITION_IDS = {c["id"] for c in ACTIVE_COMPETITIONS}

# ---------------------------------------------------------------------------
# Daily request counter  (in-memory; resets when the server restarts / new day)
# ---------------------------------------------------------------------------

_daily_requests: dict[str, int] = {}  # {"2026-03-26": 4}

MAX_DAILY_REQUESTS = 20


def _record_request():
    key = date.today().isoformat()
    _daily_requests[key] = _daily_requests.get(key, 0) + 1
    logger.info(f"API request logged: {_daily_requests[key]}/{MAX_DAILY_REQUESTS} today")


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

    Convention: the season number is the calendar year in which the season STARTS.
      - Month >= 7 (July onward)  → season just kicked off → use current year
      - Month <  7 (Jan–June)     → season started last year → use year - 1

    Examples (March 2026): month=3 < 7  → season = 2025
    Examples (August 2026): month=8 >= 7 → season = 2026
    """
    today = date.today()
    return today.year if today.month >= 7 else today.year - 1


# ---------------------------------------------------------------------------
# API status / health check
# ---------------------------------------------------------------------------

async def get_api_status() -> dict:
    """
    Check the Football-Data.org API by fetching today's match count.
    Returns a dict with: available, daily_used, daily_limit, api_key_set.
    """
    key = settings.FOOTBALL_DATA_API_KEY or settings.API_FOOTBALL_KEY
    if not key:
        return {
            "available": False,
            "api_key_set": False,
            "daily_used": 0,
            "daily_limit": MAX_DAILY_REQUESTS,
            "source": "football-data.org",
        }

    daily_used = get_daily_request_count()
    return {
        "available": not is_over_daily_limit(),
        "api_key_set": True,
        "daily_used": daily_used,
        "daily_limit": MAX_DAILY_REQUESTS,
        "remaining": MAX_DAILY_REQUESTS - daily_used,
        "source": "football-data.org",
        "season": get_current_season(),
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
    # SCHEDULED, TIMED, POSTPONED, SUSPENDED, CANCELLED → all stored as scheduled
    return "scheduled"


def _extract_season_year(match: dict) -> int:
    """
    Extract season start year from a Football-Data.org match object.
    Falls back to our auto-detected current season.
    """
    try:
        start_date_str = match.get("season", {}).get("startDate", "")
        if start_date_str:
            return int(start_date_str[:4])
    except (ValueError, TypeError):
        pass
    return get_current_season()


async def _fetch_matches_for_range(date_from: date, date_to: date) -> list | None:
    """
    Fetch all matches between date_from and date_to (inclusive) for our competitions.
    This is ONE API call that can cover multiple days — very budget-efficient.
    Returns list of match dicts on success, or None on error.
    """
    if is_over_daily_limit():
        logger.warning(
            f"Daily request limit reached ({MAX_DAILY_REQUESTS}). Skipping fetch for "
            f"{date_from} → {date_to}."
        )
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
                logger.error("Football-Data.org rate limit hit (429). Will retry next run.")
                return None
            if resp.status_code == 403:
                logger.error(
                    f"Football-Data.org returned 403 Forbidden. "
                    f"Check that FOOTBALL_DATA_API_KEY is valid."
                )
                return None
            if resp.status_code != 200:
                logger.error(
                    f"Football-Data.org returned HTTP {resp.status_code} "
                    f"for {date_from}→{date_to}: {resp.text[:200]}"
                )
                return None

            data = resp.json()
            matches = data.get("matches", [])
            count = data.get("resultSet", {}).get("count", len(matches))
            logger.info(
                f"Fetched {date_from} → {date_to}: {count} matches "
                f"({COMPETITION_CODES})"
            )
            return matches

    except Exception as e:
        logger.error(f"Failed to fetch matches {date_from}→{date_to}: {e}")
        return None


# ---------------------------------------------------------------------------
# Upsert
# ---------------------------------------------------------------------------

async def upsert_fixtures(db: Session, matches: list) -> int:
    """
    Insert new matches and update scores/status for existing ones.
    Uses Football-Data.org match IDs. Returns newly inserted count.
    """
    inserted = 0
    for m in matches:
        try:
            match_id    = m["id"]
            comp_id     = m["competition"]["id"]
            utc_date    = m["utcDate"]          # "2026-03-26T15:00:00Z"
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
                # Always update status and scores — the match may have finished
                existing.status     = status
                existing.home_score = home_score
                existing.away_score = away_score
                # Update team logos if they arrive later
                if home.get("crest"):
                    existing.home_team_logo = home["crest"]
                if away.get("crest"):
                    existing.away_team_logo = away["crest"]
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
    return inserted


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
# High-level fetch functions (called by scheduler and admin endpoints)
# ---------------------------------------------------------------------------

async def fetch_upcoming(db: Session, days_ahead: int = 3) -> dict:
    """
    Fetch today + next N days in ONE API call.
    Called during each scheduled run.  Costs 1 API call.
    """
    await ensure_leagues(db)
    today = date.today()
    date_to = today + timedelta(days=days_ahead)

    matches = await _fetch_matches_for_range(today, date_to)
    if matches is None:
        return {"fixtures_added": 0, "fixtures_updated": 0, "error": "API call failed"}

    inserted = await upsert_fixtures(db, matches)
    logger.info(
        f"Upcoming fetch complete: {inserted} new fixtures for "
        f"{today} → {date_to}"
    )
    return {
        "fixtures_added": inserted,
        "date_from": today.isoformat(),
        "date_to": date_to.isoformat(),
        "total_returned": len(matches),
    }


async def fetch_results(db: Session, days_back: int = 5) -> dict:
    """
    Fetch past N days (finished matches) in ONE API call.
    Used to update scores and mark results. Costs 1 API call.
    """
    await ensure_leagues(db)
    today = date.today()
    date_from = today - timedelta(days=days_back)
    date_to = today - timedelta(days=1)

    matches = await _fetch_matches_for_range(date_from, date_to)
    if matches is None:
        return {"fixtures_updated": 0, "error": "API call failed"}

    await upsert_fixtures(db, matches)
    finished = [m for m in matches if map_status(m["status"]) == "finished"]
    logger.info(
        f"Results fetch complete: {len(finished)} finished matches "
        f"for {date_from} → {date_to}"
    )
    return {
        "fixtures_updated": len(finished),
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "total_returned": len(matches),
    }


async def update_all_fixtures(db: Session) -> dict:
    """
    Full refresh: past 5 days + today + next 3 days.
    Uses 2 API calls. Called on startup and by admin manual trigger.
    """
    upcoming = await fetch_upcoming(db, days_ahead=3)
    past     = await fetch_results(db, days_back=5)
    return {
        "upcoming": upcoming,
        "past": past,
        "total_api_calls": 2,
    }

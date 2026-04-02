"""
Sofascore scraper — replaces Football-Data.org.

Architecture:
  - No API key required; scrapes Sofascore's public internal API.
  - Scheduler polls every 2 hours for fixtures (7-day window).
  - Separate live-match updater runs every 2 minutes during match hours.
  - All endpoints serve data from the DB — zero per-request scrapes.

Sofascore endpoints used:
  Scheduled by date : https://api.sofascore.com/api/v1/sport/football/scheduled-events/{YYYY-MM-DD}
  Live matches      : https://api.sofascore.com/api/v1/sport/football/events/live
"""

import asyncio
import httpx
import logging
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.models import Fixture, League

logger = logging.getLogger(__name__)

SOFASCORE_BASE = "https://api.sofascore.com/api/v1"

# Browser-like headers — required to avoid Sofascore's bot detection.
SOFASCORE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.sofascore.com/",
    "Origin": "https://www.sofascore.com",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
}

# ---------------------------------------------------------------------------
# League whitelist — only these leagues are stored in the DB.
# Matching is case-insensitive on the tournament name.
# Add substrings here — any name CONTAINING one of these strings is accepted.
# ---------------------------------------------------------------------------

LEAGUE_WHITELIST_SUBSTRINGS = [
    # Top European
    "premier league",
    "la liga",
    "serie a",
    "bundesliga",
    "ligue 1",
    "eredivisie",
    "primeira liga",
    "super lig",
    "scottish premiership",
    "championship",        # English Championship
    "serie b",
    "bundesliga 2",
    "ligue 2",
    "la liga 2",
    # Continental
    "champions league",
    "europa league",
    "conference league",
    "copa libertadores",
    "copa sudamericana",
    "caf champions league",
    "caf confederation",
    "africa cup",
    "afcon",
    "world cup",
    "nations league",
    # Africa — East & West & Southern
    "fkf premier league",
    "kenya premier league",
    "kpl",
    "dstv premiership",
    "premier soccer league",
    "psl",
    "npfl",
    "nigerian premier",
    "egypt premier",
    "egyptian premier",
    "nbc premier league",        # Tanzania
    "tanzanian premier",
    "uganda premier",
    "starTimes",
    "zambia super league",
    "zimbabwe premier",
    "ghana premier",
    "ethiopian premier",
    "d1 betika",
    # Americas / Asia / Other
    "mls",
    "liga mx",
    "saudi pro league",
    "saudi professional",
    "j1 league",
    "a-league",
]

# Normalise to lowercase for matching
_WHITELIST_LOWER = [s.lower() for s in LEAGUE_WHITELIST_SUBSTRINGS]


def _is_whitelisted(tournament_name: str) -> bool:
    name_lower = tournament_name.lower()
    return any(sub in name_lower for sub in _WHITELIST_LOWER)


# ---------------------------------------------------------------------------
# Status mapping
# ---------------------------------------------------------------------------

_STATUS_MAP = {
    "notstarted":   "scheduled",
    "inprogress":   "live",
    "halftime":     "live",
    "interrupted":  "live",
    "finished":     "finished",
    "ended":        "finished",
    "postponed":    "scheduled",
    "canceled":     "scheduled",
    "cancelled":    "scheduled",
    "awaitingextratime": "live",
    "extratime":    "live",
    "penaltiesshootout": "live",
    "overtime":     "live",
}


def map_status(sofascore_type: str) -> str:
    return _STATUS_MAP.get((sofascore_type or "").lower(), "scheduled")


# ---------------------------------------------------------------------------
# Season helpers
# ---------------------------------------------------------------------------

def get_current_season() -> int:
    today = date.today()
    return today.year if today.month >= 7 else today.year - 1


def _extract_season(event: dict) -> int:
    try:
        year_str = event.get("season", {}).get("year", "")
        if year_str:
            return int(year_str.split("/")[0])
    except (ValueError, TypeError, IndexError):
        pass
    return get_current_season()


# ---------------------------------------------------------------------------
# Compat stubs — kept so admin.py imports still resolve
# ---------------------------------------------------------------------------

MAX_DAILY_REQUESTS = 999  # Sofascore has no hard cap; kept for API compat


def get_daily_request_count() -> int:
    return 0


def is_over_daily_limit() -> bool:
    return False


async def get_api_status() -> dict:
    return {
        "available": True,
        "api_key_set": True,
        "source": "sofascore.com (scraper)",
        "daily_used": 0,
        "daily_limit": MAX_DAILY_REQUESTS,
        "remaining": MAX_DAILY_REQUESTS,
        "season": get_current_season(),
        "poll_interval_hours": 2,
    }


# ---------------------------------------------------------------------------
# Core HTTP fetch
# ---------------------------------------------------------------------------

def _build_fetch_url(url: str) -> tuple[str, dict]:
    """
    Return (request_url, headers) — routes through ScraperAPI when
    SCRAPERAPI_KEY is set so cloud-host IP blocks are bypassed.
    """
    from app.core.config import settings
    from urllib.parse import quote

    if settings.SCRAPERAPI_KEY:
        proxy_url = (
            f"http://api.scraperapi.com"
            f"?api_key={settings.SCRAPERAPI_KEY}"
            f"&url={quote(url, safe='')}"
            f"&render=false"
        )
        return proxy_url, {"Accept": "application/json"}

    return url, SOFASCORE_HEADERS


async def _fetch_json(url: str, retries: int = 3) -> dict | None:
    request_url, headers = _build_fetch_url(url)
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(
                timeout=30,
                follow_redirects=True,
                headers=headers,
            ) as client:
                resp = await client.get(request_url)

            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 429:
                wait = 60 * (attempt + 1)
                logger.warning(f"Sofascore 429 rate-limit. Waiting {wait}s… (attempt {attempt+1})")
                await asyncio.sleep(wait)
                continue
            if resp.status_code in (403, 404):
                logger.warning(f"Sofascore {resp.status_code} for {url}")
                return None

            logger.warning(f"Sofascore HTTP {resp.status_code} for {url}: {resp.text[:200]}")
            return None

        except Exception as e:
            logger.error(f"Sofascore fetch error (attempt {attempt+1}): {e}")
            if attempt < retries - 1:
                await asyncio.sleep(5 * (attempt + 1))
    return None


async def _fetch_events_for_date(target_date: date) -> list:
    url = f"{SOFASCORE_BASE}/sport/football/scheduled-events/{target_date.isoformat()}"
    data = await _fetch_json(url)
    if not data:
        return []
    events = data.get("events", [])
    logger.info(f"Sofascore: {len(events)} raw events for {target_date}")
    return events


async def fetch_live_events() -> list:
    url = f"{SOFASCORE_BASE}/sport/football/events/live"
    data = await _fetch_json(url)
    if not data:
        return []
    return data.get("events", [])


# ---------------------------------------------------------------------------
# League seeding
# ---------------------------------------------------------------------------

async def ensure_leagues(db: Session):
    pass  # Leagues are created on-the-fly during upsert


def _get_or_create_league(db: Session, tournament: dict) -> League | None:
    t_id   = tournament.get("id")
    t_name = tournament.get("name", "")
    t_cat  = tournament.get("category", {})
    country = t_cat.get("name", "Unknown")

    if not t_id or not t_name:
        return None

    league = db.query(League).filter(League.id == t_id).first()
    if not league:
        is_active = _is_whitelisted(t_name)
        league = League(
            id=t_id,
            name=t_name,
            country=country,
            is_active=is_active,
        )
        db.add(league)
        try:
            db.flush()
        except Exception:
            db.rollback()
            league = db.query(League).filter(League.id == t_id).first()
    return league


# ---------------------------------------------------------------------------
# Upsert
# ---------------------------------------------------------------------------

async def upsert_fixtures(db: Session, events: list) -> dict:
    """
    Process events in small batches, flushing after each batch to catch
    duplicate-key issues early without losing the whole session's work.
    Uses db.merge() so duplicate event IDs within a batch are handled
    automatically by SQLAlchemy's identity map.
    """
    from sqlalchemy import text

    inserted = 0
    updated = 0
    skipped = 0

    # Build a set of event IDs already in the DB for this session to avoid
    # O(N) queries; use a raw SQL call that scales to thousands of rows.
    all_event_ids = [ev.get("id") for ev in events if ev.get("id")]
    if all_event_ids:
        result = db.execute(
            text("SELECT id FROM fixtures WHERE id = ANY(:ids)"),
            {"ids": all_event_ids},
        )
        existing_ids: set = {row[0] for row in result}
    else:
        existing_ids = set()

    BATCH = 50   # commit every 50 records to keep transactions short

    for i, ev in enumerate(events):
        try:
            tournament = ev.get("tournament", {})
            league = _get_or_create_league(db, tournament)

            if not league or not league.is_active:
                skipped += 1
                continue

            event_id   = ev["id"]
            home       = ev.get("homeTeam", {})
            away       = ev.get("awayTeam", {})
            status_raw = ev.get("status", {}).get("type", "notstarted")
            status     = map_status(status_raw)

            home_score_data = ev.get("homeScore", {})
            away_score_data = ev.get("awayScore", {})
            home_score = home_score_data.get("current")
            away_score = away_score_data.get("current")

            ts = ev.get("startTimestamp")
            if not ts:
                continue
            kickoff = datetime.fromtimestamp(ts, tz=timezone.utc)

            season = _extract_season(ev)

            odds_data = ev.get("odds") or {}
            home_odds = odds_data.get("1")
            draw_odds = odds_data.get("x")
            away_odds = odds_data.get("2")

            home_name = home.get("name") or home.get("shortName", "Unknown")
            away_name = away.get("name") or away.get("shortName", "Unknown")

            home_logo = f"{SOFASCORE_BASE}/team/{home['id']}/image" if home.get("id") else None
            away_logo = f"{SOFASCORE_BASE}/team/{away['id']}/image" if away.get("id") else None

            if event_id in existing_ids:
                # UPDATE path — load and mutate
                existing = db.get(Fixture, event_id)
                if existing is None:
                    # May have been loaded in a previous batch; skip safely
                    continue
                existing.status     = status
                existing.home_score = home_score
                existing.away_score = away_score
                if home_odds is not None:
                    existing.home_odds = home_odds
                if draw_odds is not None:
                    existing.draw_odds = draw_odds
                if away_odds is not None:
                    existing.away_odds = away_odds
                updated += 1
            else:
                # INSERT path — use merge() so duplicates within the same
                # batch (same event on two dates) don't cause collisions.
                db.merge(Fixture(
                    id=event_id,
                    league_id=league.id,
                    home_team_id=home.get("id", 0),
                    home_team_name=home_name,
                    home_team_logo=home_logo,
                    away_team_id=away.get("id", 0),
                    away_team_name=away_name,
                    away_team_logo=away_logo,
                    kickoff=kickoff,
                    status=status,
                    home_score=home_score,
                    away_score=away_score,
                    home_odds=home_odds,
                    draw_odds=draw_odds,
                    away_odds=away_odds,
                    season=season,
                ))
                existing_ids.add(event_id)  # prevent double-insert in this run
                inserted += 1

        except Exception as e:
            logger.warning(f"Upsert error for event {ev.get('id')}: {e}")
            continue

        # Commit in small batches to keep transactions short
        if (i + 1) % BATCH == 0:
            try:
                db.commit()
            except Exception as e:
                logger.warning(f"Batch commit error at index {i}: {e}")
                db.rollback()

    # Final commit for the last partial batch
    try:
        db.commit()
    except Exception as e:
        logger.warning(f"Final commit error: {e}")
        db.rollback()

    return {"inserted": inserted, "updated": updated, "skipped": skipped}


# ---------------------------------------------------------------------------
# Main polling functions
# ---------------------------------------------------------------------------

async def fetch_window(db: Session, days_back: int = 7, days_ahead: int = 7) -> dict:
    """
    Fetch a rolling date window from Sofascore.
    One HTTP request per day in the window; dates are spaced 0.5 s apart to
    avoid hammering the server.
    """
    await ensure_leagues(db)

    today = date.today()
    dates = [
        today - timedelta(days=i)
        for i in range(days_back, 0, -1)
    ] + [
        today + timedelta(days=i)
        for i in range(days_ahead + 1)
    ]

    all_events: list = []
    for d in dates:
        events = await _fetch_events_for_date(d)
        all_events.extend(events)
        await asyncio.sleep(0.4)   # gentle rate limit

    if not all_events:
        logger.warning("Sofascore returned 0 events for the window.")
        return {"fixtures_inserted": 0, "fixtures_updated": 0, "skipped": 0, "total": 0}

    counts = await upsert_fixtures(db, all_events)
    logger.info(
        f"fetch_window ({today - timedelta(days=days_back)} → "
        f"{today + timedelta(days=days_ahead)}): "
        f"{counts['inserted']} new, {counts['updated']} updated, "
        f"{counts['skipped']} skipped (not whitelisted)"
    )
    return {
        "date_from": (today - timedelta(days=days_back)).isoformat(),
        "date_to": (today + timedelta(days=days_ahead)).isoformat(),
        "total_matches": len(all_events),
        "fixtures_inserted": counts["inserted"],
        "fixtures_updated": counts["updated"],
        "skipped": counts["skipped"],
    }


async def fetch_live(db: Session) -> dict:
    """Update live match scores — called every 2 minutes by the scheduler."""
    events = await fetch_live_events()
    if not events:
        return {"live": 0}

    counts = await upsert_fixtures(db, events)
    logger.info(f"Live update: {len(events)} events, {counts['updated']} updated")
    return {"live": len(events), "updated": counts["updated"]}


# Legacy aliases used by admin.py
async def fetch_upcoming(db: Session, days_ahead: int = 7) -> dict:
    return await fetch_window(db, days_back=0, days_ahead=days_ahead)


async def fetch_results(db: Session, days_back: int = 7) -> dict:
    return await fetch_window(db, days_back=days_back, days_ahead=0)


async def update_all_fixtures(db: Session, days_ahead: int = 14, days_back: int = 30) -> dict:
    return await fetch_window(db, days_back=days_back, days_ahead=days_ahead)

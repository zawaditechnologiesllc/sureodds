"""
Dev seeder: inserts sample leagues, fixtures, and predictions so the frontend
displays data even when API_FOOTBALL_KEY is not configured.
Only runs if the fixtures table is empty.
"""
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.models import League, Fixture, Prediction

logger = logging.getLogger(__name__)

SAMPLE_LEAGUES = [
    {"id": 39,   "name": "Premier League",       "country": "England"},
    {"id": 140,  "name": "La Liga",               "country": "Spain"},
    {"id": 135,  "name": "Serie A",               "country": "Italy"},
    {"id": 78,   "name": "Bundesliga",            "country": "Germany"},
]

SAMPLE_FIXTURES = [
    # Premier League
    {
        "id": 900001, "league_id": 39, "season": 2025,
        "home_team_id": 40, "home_team_name": "Liverpool",
        "home_team_logo": "https://media.api-sports.io/football/teams/40.png",
        "away_team_id": 33, "away_team_name": "Manchester United",
        "away_team_logo": "https://media.api-sports.io/football/teams/33.png",
        "offset_hours": 1,
        "home_win_pct": 62.0, "draw_pct": 22.0, "away_win_pct": 16.0,
        "over25_pct": 74.0, "btts_pct": 65.0, "best_pick": "Home Win",
        "confidence": "high_confidence",
    },
    {
        "id": 900002, "league_id": 39, "season": 2025,
        "home_team_id": 50, "home_team_name": "Manchester City",
        "home_team_logo": "https://media.api-sports.io/football/teams/50.png",
        "away_team_id": 42, "away_team_name": "Arsenal",
        "away_team_logo": "https://media.api-sports.io/football/teams/42.png",
        "offset_hours": 3,
        "home_win_pct": 55.0, "draw_pct": 25.0, "away_win_pct": 20.0,
        "over25_pct": 68.0, "btts_pct": 60.0, "best_pick": "Home Win",
        "confidence": "high",
    },
    {
        "id": 900003, "league_id": 39, "season": 2025,
        "home_team_id": 47, "home_team_name": "Tottenham",
        "home_team_logo": "https://media.api-sports.io/football/teams/47.png",
        "away_team_id": 49, "away_team_name": "Chelsea",
        "away_team_logo": "https://media.api-sports.io/football/teams/49.png",
        "offset_hours": 5,
        "home_win_pct": 38.0, "draw_pct": 30.0, "away_win_pct": 32.0,
        "over25_pct": 55.0, "btts_pct": 58.0, "best_pick": "Draw",
        "confidence": "medium",
    },
    # La Liga
    {
        "id": 900004, "league_id": 140, "season": 2025,
        "home_team_id": 529, "home_team_name": "Barcelona",
        "home_team_logo": "https://media.api-sports.io/football/teams/529.png",
        "away_team_id": 541, "away_team_name": "Real Madrid",
        "away_team_logo": "https://media.api-sports.io/football/teams/541.png",
        "offset_hours": 2,
        "home_win_pct": 45.0, "draw_pct": 27.0, "away_win_pct": 28.0,
        "over25_pct": 62.0, "btts_pct": 70.0, "best_pick": "BTTS",
        "confidence": "high_confidence",
    },
    {
        "id": 900005, "league_id": 140, "season": 2025,
        "home_team_id": 530, "home_team_name": "Atletico Madrid",
        "home_team_logo": "https://media.api-sports.io/football/teams/530.png",
        "away_team_id": 532, "away_team_name": "Valencia",
        "away_team_logo": "https://media.api-sports.io/football/teams/532.png",
        "offset_hours": 4,
        "home_win_pct": 58.0, "draw_pct": 24.0, "away_win_pct": 18.0,
        "over25_pct": 48.0, "btts_pct": 45.0, "best_pick": "Home Win",
        "confidence": "high",
    },
    # Serie A
    {
        "id": 900006, "league_id": 135, "season": 2025,
        "home_team_id": 489, "home_team_name": "AC Milan",
        "home_team_logo": "https://media.api-sports.io/football/teams/489.png",
        "away_team_id": 505, "away_team_name": "Inter Milan",
        "away_team_logo": "https://media.api-sports.io/football/teams/505.png",
        "offset_hours": 2,
        "home_win_pct": 36.0, "draw_pct": 28.0, "away_win_pct": 36.0,
        "over25_pct": 58.0, "btts_pct": 55.0, "best_pick": "Draw",
        "confidence": "medium",
    },
    {
        "id": 900007, "league_id": 135, "season": 2025,
        "home_team_id": 496, "home_team_name": "Juventus",
        "home_team_logo": "https://media.api-sports.io/football/teams/496.png",
        "away_team_id": 492, "away_team_name": "Napoli",
        "away_team_logo": "https://media.api-sports.io/football/teams/492.png",
        "offset_hours": 6,
        "home_win_pct": 44.0, "draw_pct": 26.0, "away_win_pct": 30.0,
        "over25_pct": 52.0, "btts_pct": 50.0, "best_pick": "Home Win",
        "confidence": "medium",
    },
    # Bundesliga
    {
        "id": 900008, "league_id": 78, "season": 2025,
        "home_team_id": 157, "home_team_name": "Bayern Munich",
        "home_team_logo": "https://media.api-sports.io/football/teams/157.png",
        "away_team_id": 165, "away_team_name": "Borussia Dortmund",
        "away_team_logo": "https://media.api-sports.io/football/teams/165.png",
        "offset_hours": 3,
        "home_win_pct": 66.0, "draw_pct": 18.0, "away_win_pct": 16.0,
        "over25_pct": 78.0, "btts_pct": 72.0, "best_pick": "Home Win",
        "confidence": "high_confidence",
    },
]


def seed_demo_data(db: Session) -> int:
    """
    Seeds leagues, fixtures, and predictions with demo data.
    Only inserts if no fixtures exist yet.
    Returns number of fixtures seeded.
    """
    existing = db.query(Fixture).count()
    if existing > 0:
        logger.info(f"Skipping demo seed — {existing} fixture(s) already in DB.")
        return 0

    logger.info("No fixtures found — seeding demo data for development...")

    # Ensure leagues exist
    for league_data in SAMPLE_LEAGUES:
        if not db.query(League).filter(League.id == league_data["id"]).first():
            db.add(League(**league_data))
    db.flush()

    today_utc = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    seeded = 0

    for f in SAMPLE_FIXTURES:
        kickoff = today_utc + timedelta(hours=f["offset_hours"])

        if not db.query(Fixture).filter(Fixture.id == f["id"]).first():
            fixture = Fixture(
                id=f["id"],
                league_id=f["league_id"],
                season=f["season"],
                home_team_id=f["home_team_id"],
                home_team_name=f["home_team_name"],
                home_team_logo=f["home_team_logo"],
                away_team_id=f["away_team_id"],
                away_team_name=f["away_team_name"],
                away_team_logo=f["away_team_logo"],
                kickoff=kickoff,
                status="scheduled",
            )
            db.add(fixture)
            db.flush()

            prediction = Prediction(
                fixture_id=f["id"],
                home_win_pct=f["home_win_pct"],
                draw_pct=f["draw_pct"],
                away_win_pct=f["away_win_pct"],
                over25_pct=f["over25_pct"],
                btts_pct=f["btts_pct"],
                best_pick=f["best_pick"],
                confidence=f["confidence"],
            )
            db.add(prediction)
            seeded += 1

    db.commit()
    logger.info(f"Demo seed complete: {seeded} fixtures + predictions inserted.")
    return seeded

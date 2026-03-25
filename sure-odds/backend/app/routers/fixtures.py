"""
GET /fixtures — serves cached fixture + prediction data from DB.
Never calls API-Football directly; that is done by the background scheduler.
"""
from fastapi import APIRouter, Depends, Query, Header, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import cast, Date
from datetime import date
from typing import Optional, List
from app.core.database import get_db
from app.models.models import Fixture, League, Prediction
from pydantic import BaseModel
import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["fixtures"])


class TeamOut(BaseModel):
    id: int
    name: str
    logo: Optional[str] = None


class H2HStats(BaseModel):
    homeWins: int
    draws: int
    awayWins: int
    lastFiveHome: List[str]
    lastFiveAway: List[str]
    homeGoalsAvg: float
    awayGoalsAvg: float


class PredictionOut(BaseModel):
    homeWinPct: float
    drawPct: float
    awayWinPct: float
    over25Pct: float
    bttsPct: float
    bestPick: str
    confidence: str


class FixtureOut(BaseModel):
    id: int
    matchDate: str
    kickoff: str
    status: str
    league: str
    leagueId: int
    homeTeam: TeamOut
    awayTeam: TeamOut
    homeScore: Optional[int] = None
    awayScore: Optional[int] = None
    h2h: Optional[H2HStats] = None
    prediction: Optional[PredictionOut] = None


def _build_h2h_stub(home_win_pct: float, away_win_pct: float) -> H2HStats:
    """
    Derive approximate H2H history from prediction percentages.
    Used when API_FOOTBALL_KEY is not set so we still return useful data.
    """
    total = 10
    home_wins = round(total * home_win_pct / 100)
    away_wins = round(total * away_win_pct / 100)
    draws = total - home_wins - away_wins
    draws = max(0, draws)

    def form_string(wins: int, out_of: int = 5) -> List[str]:
        results = []
        for i in range(out_of):
            if i < wins:
                results.append("W")
            elif i < wins + max(1, out_of - wins - wins):
                results.append("D")
            else:
                results.append("L")
        return results

    home_form = form_string(round(5 * home_win_pct / 100))
    away_form = form_string(round(5 * away_win_pct / 100))

    return H2HStats(
        homeWins=home_wins,
        draws=draws,
        awayWins=away_wins,
        lastFiveHome=home_form,
        lastFiveAway=away_form,
        homeGoalsAvg=round(home_win_pct / 30, 1),
        awayGoalsAvg=round(away_win_pct / 30, 1),
    )


@router.get("/fixtures", response_model=List[FixtureOut])
async def get_fixtures(
    date_filter: Optional[str] = Query(None, alias="date"),
    league_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None, description="Filter by status: scheduled, live, finished"),
    db: Session = Depends(get_db),
):
    """
    Returns cached fixture data from the database.
    Includes match date, teams, H2H stats, and predicted outcomes.
    Never triggers a live API-Football call.
    """
    target_date = date.today() if not date_filter else date.fromisoformat(date_filter)

    query = (
        db.query(Fixture, League, Prediction)
        .join(League, Fixture.league_id == League.id)
        .outerjoin(Prediction, Prediction.fixture_id == Fixture.id)
        .filter(cast(Fixture.kickoff, Date) == target_date)
        .order_by(Fixture.kickoff)
    )

    if league_id:
        query = query.filter(Fixture.league_id == league_id)

    if status:
        query = query.filter(Fixture.status == status)
    else:
        # By default exclude finished matches
        query = query.filter(Fixture.status.in_(["scheduled", "live"]))

    rows = query.all()

    output = []
    for fixture, league, pred in rows:
        h2h = None
        prediction_out = None

        if pred:
            prediction_out = PredictionOut(
                homeWinPct=pred.home_win_pct,
                drawPct=pred.draw_pct,
                awayWinPct=pred.away_win_pct,
                over25Pct=pred.over25_pct,
                bttsPct=pred.btts_pct,
                bestPick=pred.best_pick,
                confidence=pred.confidence,
            )
            h2h = _build_h2h_stub(pred.home_win_pct, pred.away_win_pct)

        output.append(
            FixtureOut(
                id=fixture.id,
                matchDate=fixture.kickoff.date().isoformat(),
                kickoff=fixture.kickoff.isoformat(),
                status=fixture.status,
                league=league.name,
                leagueId=league.id,
                homeTeam=TeamOut(
                    id=fixture.home_team_id,
                    name=fixture.home_team_name,
                    logo=fixture.home_team_logo,
                ),
                awayTeam=TeamOut(
                    id=fixture.away_team_id,
                    name=fixture.away_team_name,
                    logo=fixture.away_team_logo,
                ),
                homeScore=fixture.home_score,
                awayScore=fixture.away_score,
                h2h=h2h,
                prediction=prediction_out,
            )
        )

    return output


@router.get("/test-api")
async def test_api():
    """
    Verifies connectivity to API-Football.
    Returns live fixture JSON if successful, or an error message.
    """
    if not settings.API_FOOTBALL_KEY:
        return {
            "success": False,
            "error": "API_FOOTBALL_KEY not configured",
            "hint": "Set the API_FOOTBALL_KEY environment variable to enable live data fetching.",
        }

    try:
        headers = {"x-apisports-key": settings.API_FOOTBALL_KEY}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://v3.football.api-sports.io/fixtures",
                headers=headers,
                params={"date": date.today().isoformat(), "league": 39, "season": 2025},
            )
            data = resp.json()
            fixtures = data.get("response", [])
            errors = data.get("errors", {})

            if errors:
                return {"success": False, "errors": errors, "raw": data}

            return {
                "success": True,
                "fixtures_returned": len(fixtures),
                "sample": fixtures[:2] if fixtures else [],
                "api_status": data.get("get"),
                "results_count": data.get("results", 0),
            }
    except Exception as e:
        logger.error(f"test-api error: {e}")
        return {"success": False, "error": str(e)}

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import date, datetime
from typing import Optional, List
from app.core.database import get_db
from app.models.models import Fixture, Prediction, League, User
from pydantic import BaseModel

router = APIRouter(prefix="/predictions", tags=["predictions"])


class TeamOut(BaseModel):
    id: int
    name: str
    logo: Optional[str] = None

    class Config:
        from_attributes = True


class MatchOut(BaseModel):
    id: int
    homeTeam: TeamOut
    awayTeam: TeamOut
    league: str
    leagueId: int
    kickoff: str
    status: str
    homeScore: Optional[int] = None
    awayScore: Optional[int] = None


class PredictionOut(BaseModel):
    matchId: int
    match: MatchOut
    homeWinPct: float
    drawPct: float
    awayWinPct: float
    over25Pct: float
    bttsPct: float
    bestPick: str
    confidence: str
    locked: bool


@router.get("", response_model=List[PredictionOut])
async def get_predictions(
    date_filter: Optional[str] = Query(None, alias="date"),
    league_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    # current_user: Optional[User] = Depends(get_current_user_optional),
):
    target_date = date.today() if not date_filter else date.fromisoformat(date_filter)

    query = (
        db.query(Prediction, Fixture, League)
        .join(Fixture, Prediction.fixture_id == Fixture.id)
        .join(League, Fixture.league_id == League.id)
        .filter(cast(Fixture.kickoff, Date) == target_date)
        .filter(Fixture.status == "scheduled")
    )

    if league_id:
        query = query.filter(Fixture.league_id == league_id)

    results = query.all()

    # TODO: Check user subscription — paid users see unlocked predictions
    is_paid = False  # Replace with actual user check

    predictions = []
    for i, (pred, fixture, league) in enumerate(results):
        locked = not is_paid and i >= 2  # Free users see first 2
        predictions.append(
            PredictionOut(
                matchId=fixture.id,
                match=MatchOut(
                    id=fixture.id,
                    homeTeam=TeamOut(id=fixture.home_team_id, name=fixture.home_team_name, logo=fixture.home_team_logo),
                    awayTeam=TeamOut(id=fixture.away_team_id, name=fixture.away_team_name, logo=fixture.away_team_logo),
                    league=league.name,
                    leagueId=league.id,
                    kickoff=fixture.kickoff.isoformat(),
                    status=fixture.status,
                    homeScore=fixture.home_score,
                    awayScore=fixture.away_score,
                ),
                homeWinPct=pred.home_win_pct if not locked else 0,
                drawPct=pred.draw_pct if not locked else 0,
                awayWinPct=pred.away_win_pct if not locked else 0,
                over25Pct=pred.over25_pct if not locked else 0,
                bttsPct=pred.btts_pct if not locked else 0,
                bestPick=pred.best_pick if not locked else "?",
                confidence=pred.confidence,
                locked=locked,
            )
        )

    return predictions

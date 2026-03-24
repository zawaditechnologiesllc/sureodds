from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import cast, Date
from datetime import date
from typing import Optional, List
from app.core.database import get_db
from app.models.models import Fixture, Prediction, League
from pydantic import BaseModel

router = APIRouter(prefix="/predictions", tags=["predictions"])


class TeamOut(BaseModel):
    id: int
    name: str
    logo: Optional[str] = None


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
    computing: bool


@router.get("", response_model=List[PredictionOut])
async def get_predictions(
    date_filter: Optional[str] = Query(None, alias="date"),
    league_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    target_date = date.today() if not date_filter else date.fromisoformat(date_filter)

    # LEFT OUTER JOIN — fixtures show even if no prediction exists yet
    query = (
        db.query(Fixture, League, Prediction)
        .join(League, Fixture.league_id == League.id)
        .outerjoin(Prediction, Prediction.fixture_id == Fixture.id)
        .filter(cast(Fixture.kickoff, Date) == target_date)
        .filter(Fixture.status.in_(["scheduled", "live"]))
        .order_by(Fixture.kickoff)
    )

    if league_id:
        query = query.filter(Fixture.league_id == league_id)

    rows = query.all()

    is_paid = False  # TODO: wire up auth

    output = []
    for i, (fixture, league, pred) in enumerate(rows):
        has_pred = pred is not None
        locked = not is_paid and i >= 2

        output.append(
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
                homeWinPct=pred.home_win_pct if has_pred and not locked else 0,
                drawPct=pred.draw_pct if has_pred and not locked else 0,
                awayWinPct=pred.away_win_pct if has_pred and not locked else 0,
                over25Pct=pred.over25_pct if has_pred and not locked else 0,
                bttsPct=pred.btts_pct if has_pred and not locked else 0,
                bestPick=pred.best_pick if has_pred and not locked else "?",
                confidence=pred.confidence if has_pred else "computing",
                locked=locked,
                computing=not has_pred,
            )
        )

    return output

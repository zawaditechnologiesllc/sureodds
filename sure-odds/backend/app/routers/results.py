from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import cast, Date, func
from datetime import date, timedelta
from typing import Optional, List
from app.core.database import get_db
from app.models.models import Fixture, Prediction, League
from app.services.results_service import RESULTS_WINDOW_DAYS
from pydantic import BaseModel

router = APIRouter(prefix="/results", tags=["results"])

PICK_LABELS = {
    "1": "Home Win",
    "X": "Draw",
    "2": "Away Win",
    "over25": "Over 2.5",
    "btts": "BTTS",
}


class ResultOut(BaseModel):
    matchId: int
    match: dict
    prediction: str
    actual: str
    won: bool
    homeScore: int
    awayScore: int
    date: str


class ResultsSummary(BaseModel):
    total: int
    won: int
    lost: int
    accuracy: float
    results: List[ResultOut]


@router.get("", response_model=ResultsSummary)
async def get_results(
    date_filter: Optional[str] = Query(None, alias="date"),
    league_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Return prediction outcomes for a given date.

    Results are available for up to 7 days back.
    Requests for dates older than that return an empty result set —
    not an error — so the frontend can gracefully show nothing.
    """
    today = date.today()

    if date_filter:
        try:
            target_date = date.fromisoformat(date_filter)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

        # Enforce the 7-day expiry window: silently return empty for old dates
        cutoff = today - timedelta(days=RESULTS_WINDOW_DAYS)
        if target_date < cutoff:
            return ResultsSummary(total=0, won=0, lost=0, accuracy=0.0, results=[])
    else:
        # Default to yesterday when no date supplied
        target_date = today - timedelta(days=1)

    query = (
        db.query(Prediction, Fixture, League)
        .join(Fixture, Prediction.fixture_id == Fixture.id)
        .join(League, Fixture.league_id == League.id)
        .filter(cast(Fixture.kickoff, Date) == target_date)
        .filter(Fixture.status == "finished")
        .filter(Prediction.actual_result.isnot(None))
    )

    if league_id:
        query = query.filter(Fixture.league_id == league_id)

    rows = query.all()
    results = []
    won_count = 0

    for pred, fixture, league in rows:
        won = pred.is_correct or False
        if won:
            won_count += 1
        results.append(
            ResultOut(
                matchId=fixture.id,
                match={
                    "id": fixture.id,
                    "homeTeam": {"id": fixture.home_team_id, "name": fixture.home_team_name},
                    "awayTeam": {"id": fixture.away_team_id, "name": fixture.away_team_name},
                    "league": league.name,
                    "leagueId": league.id,
                    "kickoff": fixture.kickoff.isoformat(),
                    "status": "finished",
                },
                prediction=PICK_LABELS.get(pred.best_pick, pred.best_pick),
                actual=PICK_LABELS.get(pred.actual_result, pred.actual_result or ""),
                won=won,
                homeScore=fixture.home_score or 0,
                awayScore=fixture.away_score or 0,
                date=fixture.kickoff.isoformat(),
            )
        )

    total = len(results)
    accuracy = round((won_count / total) * 100, 1) if total > 0 else 0

    return ResultsSummary(
        total=total,
        won=won_count,
        lost=total - won_count,
        accuracy=accuracy,
        results=results,
    )

import logging
from fastapi import APIRouter, Depends, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import cast, Date
from datetime import date
from typing import Optional, List
from app.core.database import get_db
from app.models.models import Fixture, Prediction, League, User, UserPackage
from app.services.prediction_engine import generate_prediction
from pydantic import BaseModel

router = APIRouter(prefix="/predictions", tags=["predictions"])
logger = logging.getLogger(__name__)

_supabase_client = None


def get_supabase_client():
    global _supabase_client
    if _supabase_client is None:
        from app.core.config import settings
        from supabase import create_client
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_client


def resolve_user(authorization: Optional[str], db: Session) -> Optional[User]:
    """Try to resolve user from Bearer token. Returns None if unauthenticated."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        supabase = get_supabase_client()
        user_response = supabase.auth.get_user(token)
        supabase_user = user_response.user
        if not supabase_user:
            return None
        return db.query(User).filter(User.id == supabase_user.id).first()
    except Exception:
        return None


def can_access_premium(user: Optional[User], db: Session) -> bool:
    """Check if user has paid subscription or remaining picks."""
    if not user:
        return False
    if user.subscription_status == "paid":
        return True
    pkg = db.query(UserPackage).filter(UserPackage.user_id == user.id).first()
    return bool(pkg and pkg.remaining_picks > 0)


def consume_pick(user: User, db: Session):
    """Decrement remaining_picks if user is on a pay-as-you-go package."""
    if user.subscription_status == "paid":
        return  # Subscribers don't consume picks
    pkg = db.query(UserPackage).filter(UserPackage.user_id == user.id).first()
    if pkg and pkg.remaining_picks > 0:
        pkg.remaining_picks -= 1
        db.commit()


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
    live: bool = Query(False),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Serve predictions from the database.
    - If live=true: returns all currently in-progress matches regardless of date.
    - Otherwise: returns scheduled/live fixtures for the requested date.
    - Predictions are generated on-the-fly for any fixture that lacks one.
    Free users see 2 unlocked picks; paid users or pick-package users see all.
    """
    user = resolve_user(authorization, db)
    is_premium = can_access_premium(user, db)

    if live:
        query = (
            db.query(Fixture, League, Prediction)
            .join(League, Fixture.league_id == League.id)
            .outerjoin(Prediction, Prediction.fixture_id == Fixture.id)
            .filter(Fixture.status == "live")
            .order_by(Fixture.kickoff)
        )
    else:
        target_date = date.today() if not date_filter else date.fromisoformat(date_filter)
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

    output = []
    new_preds: list[Prediction] = []

    for i, (fixture, league, pred) in enumerate(rows):
        # Generate prediction on-the-fly if one doesn't exist yet
        if pred is None:
            try:
                probs = await generate_prediction(
                    fixture.home_team_id,
                    fixture.away_team_id,
                    fixture.league_id,
                    fixture.season,
                    db=db,
                )
                pred = Prediction(fixture_id=fixture.id, **probs)
                db.add(pred)
                new_preds.append(pred)
            except Exception as e:
                logger.warning(f"On-demand prediction failed for fixture {fixture.id}: {e}")

        has_pred = pred is not None
        locked = not is_premium and i >= 2

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

    # Persist any newly generated predictions
    if new_preds:
        try:
            db.commit()
        except Exception as e:
            logger.warning(f"Failed to save on-demand predictions: {e}")
            db.rollback()

    return output

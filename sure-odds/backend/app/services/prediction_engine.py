"""
Prediction Engine — calculates match probabilities based on historical data.
In production, this fetches real stats from API-Football.
"""

import httpx
from typing import Optional
from app.core.config import settings


API_FOOTBALL_BASE = "https://v3.football.api-sports.io"


async def fetch_fixture_stats(fixture_id: int) -> dict:
    """Fetch fixture stats from API-Football."""
    headers = {"x-apisports-key": settings.API_FOOTBALL_KEY}
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_FOOTBALL_BASE}/fixtures",
            headers=headers,
            params={"id": fixture_id},
        )
        data = resp.json()
        return data.get("response", [{}])[0]


async def fetch_head_to_head(team1_id: int, team2_id: int) -> list:
    """Fetch head-to-head records."""
    headers = {"x-apisports-key": settings.API_FOOTBALL_KEY}
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_FOOTBALL_BASE}/fixtures/headtohead",
            headers=headers,
            params={"h2h": f"{team1_id}-{team2_id}", "last": 10},
        )
        data = resp.json()
        return data.get("response", [])


async def fetch_team_form(team_id: int, league_id: int, season: int) -> list:
    """Fetch last 5 matches for a team."""
    headers = {"x-apisports-key": settings.API_FOOTBALL_KEY}
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_FOOTBALL_BASE}/fixtures",
            headers=headers,
            params={
                "team": team_id,
                "league": league_id,
                "season": season,
                "last": 5,
                "status": "FT",
            },
        )
        data = resp.json()
        return data.get("response", [])


def calculate_form_score(fixtures: list, team_id: int) -> float:
    """Calculate a 0-1 form score from recent matches."""
    if not fixtures:
        return 0.5
    points = 0
    max_points = len(fixtures) * 3
    for f in fixtures:
        home_id = f["teams"]["home"]["id"]
        home_goals = f["goals"]["home"] or 0
        away_goals = f["goals"]["away"] or 0
        if team_id == home_id:
            if home_goals > away_goals:
                points += 3
            elif home_goals == away_goals:
                points += 1
        else:
            if away_goals > home_goals:
                points += 3
            elif home_goals == away_goals:
                points += 1
    return points / max_points if max_points > 0 else 0.5


def calculate_h2h_advantage(h2h_fixtures: list, home_team_id: int, away_team_id: int) -> float:
    """Returns home advantage score from h2h (-1 to 1, positive = home advantage)."""
    if not h2h_fixtures:
        return 0.0
    home_wins = 0
    away_wins = 0
    for f in h2h_fixtures:
        h_id = f["teams"]["home"]["id"]
        a_id = f["teams"]["away"]["id"]
        home_g = f["goals"]["home"] or 0
        away_g = f["goals"]["away"] or 0
        if home_g > away_g:
            if h_id == home_team_id:
                home_wins += 1
            else:
                away_wins += 1
        elif away_g > home_g:
            if a_id == away_team_id:
                away_wins += 1
            else:
                home_wins += 1
    total = home_wins + away_wins
    if total == 0:
        return 0.0
    return (home_wins - away_wins) / total


def compute_probabilities(
    home_form: float,
    away_form: float,
    h2h_advantage: float,
    home_advantage: float = 0.05,
) -> dict:
    """
    Compute raw probabilities for 1X2, Over 2.5, and BTTS.
    All values are percentages (0-100).
    """
    # Base probabilities using form + h2h
    home_strength = home_form * 0.6 + (h2h_advantage + 1) / 2 * 0.3 + home_advantage * 0.1
    away_strength = away_form * 0.6 + (1 - (h2h_advantage + 1) / 2) * 0.3

    total = home_strength + away_strength + 0.25  # 0.25 for draw
    home_win_pct = round((home_strength / total) * 100, 1)
    away_win_pct = round((away_strength / total) * 100, 1)
    draw_pct = round(100 - home_win_pct - away_win_pct, 1)

    # Over 2.5: based on both teams' attacking form
    combined_attack = (home_form + away_form) / 2
    over25_pct = round(40 + combined_attack * 35, 1)

    # BTTS: based on both teams' ability to score
    btts_pct = round(35 + home_form * 20 + away_form * 20, 1)

    # Clamp values
    home_win_pct = max(5, min(90, home_win_pct))
    draw_pct = max(5, min(50, draw_pct))
    away_win_pct = max(5, min(90, away_win_pct))
    over25_pct = max(20, min(85, over25_pct))
    btts_pct = max(20, min(80, btts_pct))

    # Determine best pick
    picks = {
        "1": home_win_pct,
        "X": draw_pct,
        "2": away_win_pct,
        "over25": over25_pct,
        "btts": btts_pct,
    }
    best_pick = max(picks, key=lambda k: picks[k])
    best_pct = picks[best_pick]

    # Confidence level
    if best_pct >= 65:
        confidence = "high"
    elif best_pct >= 50:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "home_win_pct": home_win_pct,
        "draw_pct": draw_pct,
        "away_win_pct": away_win_pct,
        "over25_pct": over25_pct,
        "btts_pct": btts_pct,
        "best_pick": best_pick,
        "confidence": confidence,
    }


async def generate_prediction(
    home_team_id: int,
    away_team_id: int,
    league_id: int,
    season: int,
) -> dict:
    """Full prediction pipeline for a single fixture."""
    home_form_data = await fetch_team_form(home_team_id, league_id, season)
    away_form_data = await fetch_team_form(away_team_id, league_id, season)
    h2h_data = await fetch_head_to_head(home_team_id, away_team_id)

    home_form = calculate_form_score(home_form_data, home_team_id)
    away_form = calculate_form_score(away_form_data, away_team_id)
    h2h_advantage = calculate_h2h_advantage(h2h_data, home_team_id, away_team_id)

    return compute_probabilities(home_form, away_form, h2h_advantage)

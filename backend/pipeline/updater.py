"""On a new result: update Elo → re-simulate → save → broadcast."""

import json
import joblib

from backend.api.websocket import manager
from backend.data.wc2026_groups import WC2026_GROUPS
from backend.ml.elo import update_elo
from backend.ml.simulator import CACHE_PATH, simulate_tournament

MODEL_PATH = "backend/models/model.pkl"


async def update_and_broadcast(
    home_team: str,
    away_team: str,
    home_score: int,
    away_score: int,
) -> None:
    bundle = joblib.load(MODEL_PATH)
    model = bundle["model"]
    elos: dict[str, float] = bundle["elos"]

    r_home = elos.get(home_team, 1500.0)
    r_away = elos.get(away_team, 1500.0)
    elos[home_team], elos[away_team] = update_elo(r_home, r_away, home_score, away_score)

    results = simulate_tournament(model, elos, WC2026_GROUPS, n=10_000, save=True)
    await manager.broadcast(json.dumps(results))

"""GET /api/predictions — serve cached simulation probabilities.
POST /api/simulate-custom — run a full simulation on a custom group draw.
"""

import json
from pathlib import Path

import joblib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.ml.simulator import simulate_tournament

router = APIRouter()

_CACHE_PATH = Path(__file__).parent.parent.parent / "data" / "cache" / "simulation.json"
_MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "model.pkl"


@router.get("/predictions")
def get_predictions() -> dict:
    if not _CACHE_PATH.exists():
        raise HTTPException(status_code=503, detail="Simulation not ready — try again shortly")
    with open(_CACHE_PATH) as f:
        return json.load(f)


class _CustomPayload(BaseModel):
    groups: dict[str, list[str]]


@router.post("/simulate-custom")
def simulate_custom(payload: _CustomPayload) -> dict:
    if not _MODEL_PATH.exists():
        raise HTTPException(status_code=503, detail="Model not available")

    groups = payload.groups
    for g, teams in groups.items():
        if len(teams) != 4:
            raise HTTPException(
                status_code=400,
                detail=f"Group {g} must have exactly 4 teams, got {len(teams)}",
            )

    all_teams = [t for teams in groups.values() for t in teams]
    if len(all_teams) != 48:
        raise HTTPException(
            status_code=400,
            detail=f"Expected 48 teams total, got {len(all_teams)}",
        )
    if len(set(all_teams)) != len(all_teams):
        raise HTTPException(status_code=400, detail="Duplicate teams detected")

    bundle = joblib.load(_MODEL_PATH)
    results = simulate_tournament(
        bundle["model"], bundle["elos"], groups, n=10_000, save=False
    )
    return results

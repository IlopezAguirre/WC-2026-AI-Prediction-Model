"""GET /api/predictions — serve cached simulation probabilities."""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter()

CACHE_PATH = Path(__file__).parent.parent.parent / "data" / "cache" / "simulation.json"


@router.get("/predictions")
def get_predictions() -> dict:
    if not CACHE_PATH.exists():
        raise HTTPException(status_code=503, detail="Simulation not ready — try again shortly")
    with open(CACHE_PATH) as f:
        return json.load(f)

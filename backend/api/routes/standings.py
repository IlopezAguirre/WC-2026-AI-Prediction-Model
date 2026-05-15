"""GET /api/standings — simulated group standings for WC 2026."""

from pathlib import Path

import joblib
from fastapi import APIRouter

from backend.data.wc2026_groups import WC2026_GROUPS
from backend.ml.simulator import simulate_group_stage

router = APIRouter()

_MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "model.pkl"


@router.get("/standings")
def get_standings() -> dict:
    bundle = joblib.load(_MODEL_PATH)
    model = bundle["model"]
    elos = bundle["elos"]
    return simulate_group_stage(model, elos, WC2026_GROUPS)

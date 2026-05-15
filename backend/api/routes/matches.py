"""GET /api/matches — predicted scorelines for every group-stage fixture."""

from pathlib import Path

import joblib
from fastapi import APIRouter

from backend.data.wc2026_groups import WC2026_GROUPS
from backend.ml.model import predict_goals

router = APIRouter()

_MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "model.pkl"


@router.get("/matches")
def get_matches() -> list[dict]:
    bundle = joblib.load(_MODEL_PATH)
    model = bundle["model"]
    elos = bundle["elos"]

    matches = []
    for group, teams in WC2026_GROUPS.items():
        for i in range(len(teams)):
            for j in range(i + 1, len(teams)):
                team_a, team_b = teams[i], teams[j]
                ga, gb = predict_goals(model, elos, team_a, team_b, neutral=True)
                matches.append(
                    {
                        "group": group,
                        "home": team_a,
                        "away": team_b,
                        "predicted_home_goals": round(ga, 2),
                        "predicted_away_goals": round(gb, 2),
                    }
                )
    return matches

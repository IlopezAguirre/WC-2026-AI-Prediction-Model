"""Integration tests for the Poisson GLM prediction module.

These tests require a trained model bundle at backend/models/model.pkl.
Run train.py first, then:
    pytest backend/tests/test_model.py -v
"""

from pathlib import Path

import pytest
import joblib

from backend.ml.model import predict_goals

MODEL_PATH = Path(__file__).parent.parent / "models" / "model.pkl"


@pytest.fixture(scope="module")
def bundle():
    """Load the trained model bundle; skip entire module if not yet built."""
    if not MODEL_PATH.exists():
        pytest.skip(
            "model.pkl not found — run `python -m backend.ml.train` first."
        )
    return joblib.load(MODEL_PATH)


@pytest.fixture(scope="module")
def model(bundle):
    """Unwrap the fitted GLM from the bundle."""
    return bundle["model"]


@pytest.fixture(scope="module")
def elos(bundle):
    """Unwrap the current Elo ratings dict from the bundle."""
    return bundle["elos"]


class TestPredictGoals:
    def test_predictions_are_always_positive(self, model, elos):
        """Poisson lambda values must be strictly positive for any matchup."""
        ga, gb = predict_goals(model, elos, "Brazil", "Saudi Arabia")
        assert ga > 0.0
        assert gb > 0.0

    def test_brazil_dominates_san_marino(self, model, elos):
        """Brazil's expected goals vs San Marino must exceed San Marino's."""
        ga, gb = predict_goals(model, elos, "Brazil", "San Marino")
        assert ga > gb, f"Expected Brazil > San Marino, got {ga:.2f} vs {gb:.2f}"

    def test_strong_vs_weak_asymmetry(self, model, elos):
        """Brazil's expected goals (as home side) must exceed San Marino's (as home side)."""
        # Brazil as team_a: large positive elo_diff → high lambda
        goals_bra, _ = predict_goals(model, elos, "Brazil", "San Marino")
        # San Marino as team_a: large negative elo_diff → low lambda
        goals_smr, _ = predict_goals(model, elos, "San Marino", "Brazil")
        assert goals_bra > goals_smr

    def test_neutral_ground_reduces_home_advantage(self, model, elos):
        """Team A should score more when playing at home than on neutral ground."""
        goals_home, _ = predict_goals(model, elos, "Brazil", "Germany", neutral=False)
        goals_neutral, _ = predict_goals(model, elos, "Brazil", "Germany", neutral=True)
        assert goals_home > goals_neutral, (
            f"Home advantage not reflected: home={goals_home:.3f}, neutral={goals_neutral:.3f}"
        )

    def test_unknown_team_uses_default_rating(self, model, elos):
        """An unrecognised team name must not raise — it falls back to DEFAULT_RATING."""
        ga, gb = predict_goals(model, elos, "Brazil", "Atlantis FC")
        assert ga > 0.0
        assert gb > 0.0

    def test_elo_diff_coefficient_is_positive(self, model, elos):
        """The GLM coefficient for elo_diff must be positive (more Elo → more goals)."""
        coef = model.params["elo_diff"]
        assert coef > 0, f"elo_diff coefficient is {coef:.6f} — expected positive"

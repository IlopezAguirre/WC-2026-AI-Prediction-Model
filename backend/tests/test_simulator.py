"""Unit tests for the Monte Carlo tournament simulator.

Run with:
    pytest backend/tests/test_simulator.py -v
"""

import joblib
import pytest

from backend.ml.simulator import simulate_match, simulate_group_stage, simulate_tournament

MODEL_PATH = "backend/models/model.pkl"


@pytest.fixture(scope="module")
def bundle():
    return joblib.load(MODEL_PATH)


@pytest.fixture(scope="module")
def model(bundle):
    return bundle["model"]


@pytest.fixture(scope="module")
def elos(bundle):
    return bundle["elos"]


class TestSimulateMatch:
    def test_returns_non_negative_integers(self, model, elos):
        """Both goal counts must be non-negative integers."""
        for _ in range(50):
            ga, gb = simulate_match(model, elos, "France", "Brazil")
            assert isinstance(ga, int) and ga >= 0
            assert isinstance(gb, int) and gb >= 0

    def test_knockout_never_draws(self, model, elos):
        """In knockout mode the result must never be a draw."""
        for _ in range(100):
            ga, gb = simulate_match(model, elos, "Spain", "Argentina", knockout=True)
            assert ga != gb

    def test_returns_tuple_of_two(self, model, elos):
        """Return value must be a two-element tuple."""
        result = simulate_match(model, elos, "Germany", "England")
        assert len(result) == 2

    def test_unknown_team_uses_default_elo(self, model, elos):
        """An unrecognised team name should not raise — it falls back to default Elo."""
        ga, gb = simulate_match(model, elos, "Atlantis FC", "Brazil")
        assert ga >= 0 and gb >= 0


class TestDominance:
    def test_dominant_team_wins_majority(self, model, elos):
        """Spain (Elo ~2171) should beat San Marino (Elo ~841) in >70% of matches."""
        wins = sum(
            1
            for _ in range(500)
            if simulate_match(model, elos, "Spain", "San Marino", knockout=True)[0]
            > simulate_match(model, elos, "Spain", "San Marino", knockout=True)[1]
        )
        # Re-run cleanly to avoid double-sampling above
        wins = 0
        for _ in range(500):
            ga, gb = simulate_match(model, elos, "Spain", "San Marino", knockout=True)
            if ga > gb:
                wins += 1
        assert wins / 500 > 0.70, f"Spain won only {wins}/500 — dominance check failed"


class TestSimulateTournament:
    MINI_GROUPS = {
        "A": ["Spain", "France", "Argentina", "Brazil"],
        "B": ["England", "Germany", "Portugal", "Netherlands"],
        "C": ["Croatia", "Colombia", "Ecuador", "Uruguay"],
    }

    def test_winner_probabilities_sum_to_one(self, model, elos):
        """Winner probabilities across all teams must sum to 1.0 (within float tolerance)."""
        results = simulate_tournament(model, elos, self.MINI_GROUPS, n=200, save=False)
        total = sum(v["winner"] for v in results.values())
        assert total == pytest.approx(1.0, abs=0.02)

    def test_final_prob_gte_winner_prob(self, model, elos):
        """Reaching the final is at least as likely as winning it."""
        results = simulate_tournament(model, elos, self.MINI_GROUPS, n=200, save=False)
        for team, probs in results.items():
            assert probs["final"] >= probs["winner"], (
                f"{team}: final prob {probs['final']} < winner prob {probs['winner']}"
            )

    def test_semi_prob_gte_final_prob(self, model, elos):
        """Reaching the semis is at least as likely as reaching the final."""
        results = simulate_tournament(model, elos, self.MINI_GROUPS, n=200, save=False)
        for team, probs in results.items():
            assert probs["semi"] >= probs["final"], (
                f"{team}: semi prob {probs['semi']} < final prob {probs['final']}"
            )

    def test_all_teams_have_all_stages(self, model, elos):
        """Every team in the groups must have entries for all four stages."""
        results = simulate_tournament(model, elos, self.MINI_GROUPS, n=100, save=False)
        expected_stages = {"winner", "final", "semi", "quarter"}
        for team, probs in results.items():
            assert set(probs.keys()) == expected_stages

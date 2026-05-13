"""Unit tests for the Elo rating module.

Run with:
    pytest backend/tests/test_elo.py -v
"""

import pytest

from backend.ml.elo import DEFAULT_RATING, K_FACTOR, expected_score, update_elo


class TestExpectedScore:
    def test_equal_ratings_give_half(self):
        """Two equally-rated teams should each have 0.5 expected score."""
        assert expected_score(1500, 1500) == pytest.approx(0.5)

    def test_higher_rating_gives_higher_expectation(self):
        """A stronger team always has a higher expected score."""
        assert expected_score(1600, 1400) > 0.5
        assert expected_score(1400, 1600) < 0.5

    def test_expected_scores_sum_to_one(self):
        """Complementary expected scores must sum to 1."""
        ea = expected_score(1700, 1300)
        eb = expected_score(1300, 1700)
        assert ea + eb == pytest.approx(1.0)


class TestUpdateElo:
    def test_winner_always_gains_elo(self):
        """A team that wins must always leave with a higher rating."""
        new_a, _ = update_elo(1500, 1500, 2, 1)
        assert new_a > 1500

    def test_loser_always_loses_elo(self):
        """A team that loses must always leave with a lower rating."""
        new_a, _ = update_elo(1500, 1500, 0, 1)
        assert new_a < 1500

    def test_draw_brings_ratings_closer(self):
        """A draw must push unequal ratings toward each other."""
        new_high, new_low = update_elo(1600, 1400, 1, 1)
        assert new_high < 1600, "Stronger team should drop after drawing a weaker side"
        assert new_low > 1400, "Weaker team should rise after drawing a stronger side"

    def test_upset_gains_more_than_expected_win(self):
        """Beating a much stronger opponent yields more points than beating an equal one."""
        _, equal_win_rating = update_elo(1500, 1500, 0, 1)
        equal_gain = equal_win_rating - 1500

        _, upset_rating = update_elo(1700, 1300, 0, 1)
        upset_gain = upset_rating - 1300

        assert upset_gain > equal_gain

    def test_zero_sum_property(self):
        """Points gained by the winner must equal points lost by the loser."""
        r_a, r_b = 1600.0, 1400.0
        new_a, new_b = update_elo(r_a, r_b, 3, 1)
        assert (new_a - r_a) + (new_b - r_b) == pytest.approx(0.0, abs=1e-9)

    def test_k_factor_bounds_max_change(self):
        """No single result should shift a rating by more than K_FACTOR points."""
        new_a, _ = update_elo(1000, 3000, 1, 0)  # massive favourite wins
        assert abs(new_a - 1000) <= K_FACTOR

"""Elo rating system for international football teams.

All functions are pure (no I/O) except save_elos_to_db.
Ratings start at DEFAULT_RATING = 1500 and are updated with K_FACTOR = 32
after every match using the standard Elo formula.

load_external_elos() provides an alternative to compute_all_elos() that uses
a pre-computed eloratings.csv dataset (variable K-factors by match importance),
falling back to self-computed ratings for any gaps (e.g. 2026 fixtures).
"""

import sqlite3
from pathlib import Path

import pandas as pd

DEFAULT_RATING: float = 1500.0
K_FACTOR: float = 32.0

EXTERNAL_ELO_PATH = Path(__file__).parent.parent / "data" / "raw" / "eloratings.csv"

# Maps team names used in eloratings.csv → names used in results.csv.
# Only entries where the two datasets disagree are listed.
_ELO_TO_RESULTS: dict[str, str] = {
    "United States": "USA",
    "Democratic Republic of Congo": "DR Congo",
    "Ireland": "Republic of Ireland",
    "Czechia": "Czech Republic",
    "China": "China PR",
    "Surinam": "Suriname",
    "Macedonia": "North Macedonia",
    "Congo-Brazzaville": "Congo",
    "East Timor": "Timor-Leste",
}
_RESULTS_TO_ELO: dict[str, str] = {v: k for k, v in _ELO_TO_RESULTS.items()}


def expected_score(rating_a: float, rating_b: float) -> float:
    """Return the expected score for team A against team B.

    Expected score is the probability of a win plus half the probability
    of a draw, per the standard Elo formula:  1 / (1 + 10^((Rb - Ra) / 400)).
    """
    return 1.0 / (1.0 + 10.0 ** ((rating_b - rating_a) / 400.0))


def update_elo(
    rating_a: float,
    rating_b: float,
    score_a: float,
    score_b: float,
) -> tuple[float, float]:
    """Return updated (rating_a, rating_b) after a match result.

    Actual outcome is mapped to 1.0 (win), 0.5 (draw), or 0.0 (loss)
    for team A; team B receives the complement.
    """
    if score_a > score_b:
        actual_a = 1.0
    elif score_a == score_b:
        actual_a = 0.5
    else:
        actual_a = 0.0
    actual_b = 1.0 - actual_a

    exp_a = expected_score(rating_a, rating_b)
    exp_b = expected_score(rating_b, rating_a)

    new_a = rating_a + K_FACTOR * (actual_a - exp_a)
    new_b = rating_b + K_FACTOR * (actual_b - exp_b)
    return new_a, new_b


def compute_all_elos(
    matches_df: pd.DataFrame,
) -> tuple[dict[str, float], pd.DataFrame]:
    """Process every match in chronological order and return ratings + history.

    Returns
    -------
    current_ratings : dict[team_name -> current Elo]
    elo_history_df  : one row per team per match with columns
                      [date, team, rating, opponent, opponent_rating,
                       goals_for, goals_against, is_home]
                      where *rating* and *opponent_rating* are the
                      PRE-match values used as model features.
    """
    ratings: dict[str, float] = {}
    rows: list[dict] = []

    sorted_matches = matches_df.sort_values("date")

    for row in sorted_matches.itertuples(index=False):
        if pd.isna(row.home_score) or pd.isna(row.away_score):
            continue

        home, away = row.home_team, row.away_team
        r_home = ratings.get(home, DEFAULT_RATING)
        r_away = ratings.get(away, DEFAULT_RATING)
        neutral = int(row.neutral)

        rows.append(
            {
                "date": row.date,
                "team": home,
                "rating": r_home,
                "opponent": away,
                "opponent_rating": r_away,
                "goals_for": int(row.home_score),
                "goals_against": int(row.away_score),
                "is_home": 1 - neutral,  # home = 1 when not on neutral ground
            }
        )
        rows.append(
            {
                "date": row.date,
                "team": away,
                "rating": r_away,
                "opponent": home,
                "opponent_rating": r_home,
                "goals_for": int(row.away_score),
                "goals_against": int(row.home_score),
                "is_home": 0,  # away team never has home advantage
            }
        )

        ratings[home], ratings[away] = update_elo(
            r_home, r_away, row.home_score, row.away_score
        )

    return ratings, pd.DataFrame(rows)


def save_elos_to_db(conn: sqlite3.Connection, elo_history_df: pd.DataFrame) -> None:
    """Persist the full Elo history to the *elo_history* table."""
    elo_history_df.to_sql("elo_history", conn, if_exists="replace", index=False)
    conn.commit()

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

# Teams that no longer exist as FIFA members — excluded from current ratings
# so the simulator never assigns a frozen historical Elo to a live team slot.
_DEFUNCT_TEAMS: frozenset[str] = frozenset({
    "West Germany",
    "East Germany",
    "Soviet Union",
    "Czechoslovakia",
    "Yugoslavia",
    "Serbia and Montenegro",
    "Netherlands Antilles",
    "United Arab Republic",
    "North Yemen",
    "South Yemen",
    "British Guiana",
    "British Honduras",
    "Khmer Republic",
    "South Vietnam",
    "North Vietnam",
})


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


def load_external_elos(
    matches_df: pd.DataFrame,
    elo_path: Path = EXTERNAL_ELO_PATH,
) -> tuple[dict[str, float], pd.DataFrame]:
    """Build elo history from eloratings.csv, falling back to K=32 for gaps.

    The external dataset uses variable K-factors by match importance
    (friendlies K=20, WC finals K=60), making its pre-match ratings more
    accurate than our flat K=32.  Pre-match Elo is recovered as
    (rating - change).

    For any match not covered by the external dataset (e.g. 2026 fixtures
    that postdate the file), self-computed Elo is used as a fallback so the
    feature matrix never contains NaN values.

    Returns the same (current_ratings, elo_history_df) interface as
    compute_all_elos() so train.py needs no structural changes.
    """
    # ── Load and normalise external dataset ───────────────────────────────
    ext = pd.read_csv(elo_path)
    ext["team"] = ext["team"].str.replace("\xa0", " ", regex=False)
    ext["team"] = ext["team"].map(lambda t: _ELO_TO_RESULTS.get(t, t))
    ext["date"] = pd.to_datetime(ext["date"], format="mixed", dayfirst=False)
    ext["pre_match_elo"] = ext["rating"] - ext["change"]
    ext = ext.dropna(subset=["pre_match_elo", "rating"])  # 31 Moldova rows missing rating

    # Fast (date, team) → pre_match_elo lookup
    ext_lookup = ext.set_index(["date", "team"])["pre_match_elo"]
    latest_per_team = (
        ext.sort_values("date").groupby("team")["rating"].last().to_dict()
    )

    # ── Self-computed fallback ratings (kept current as we walk the timeline)
    fallback: dict[str, float] = {}

    rows: list[dict] = []

    for row in matches_df.sort_values("date").itertuples(index=False):
        if pd.isna(row.home_score) or pd.isna(row.away_score):
            continue

        home, away = row.home_team, row.away_team
        match_date = pd.Timestamp(row.date)
        neutral = int(row.neutral)

        # Prefer external pre-match Elo; fall back to self-computed
        try:
            r_home = float(ext_lookup.loc[(match_date, home)])
        except KeyError:
            r_home = fallback.get(home, DEFAULT_RATING)

        try:
            r_away = float(ext_lookup.loc[(match_date, away)])
        except KeyError:
            r_away = fallback.get(away, DEFAULT_RATING)

        rows.append({
            "date": row.date,
            "team": home,
            "rating": r_home,
            "opponent": away,
            "opponent_rating": r_away,
            "goals_for": int(row.home_score),
            "goals_against": int(row.away_score),
            "is_home": 1 - neutral,
        })
        rows.append({
            "date": row.date,
            "team": away,
            "rating": r_away,
            "opponent": home,
            "opponent_rating": r_home,
            "goals_for": int(row.away_score),
            "goals_against": int(row.home_score),
            "is_home": 0,
        })

        # Advance fallback so later gaps inherit a sensible starting point
        fallback[home], fallback[away] = update_elo(
            fallback.get(home, DEFAULT_RATING),
            fallback.get(away, DEFAULT_RATING),
            row.home_score,
            row.away_score,
        )

    elo_history_df = pd.DataFrame(rows)

    # Current ratings: external where available, fallback otherwise.
    # Defunct historical teams are excluded so the simulator never uses a
    # rating frozen decades in the past for a team that no longer exists.
    all_teams = (set(fallback) | set(latest_per_team)) - _DEFUNCT_TEAMS
    current_ratings = {
        team: latest_per_team.get(team, fallback.get(team, DEFAULT_RATING))
        for team in all_teams
    }

    return current_ratings, elo_history_df

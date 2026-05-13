"""Poisson GLM for predicting expected goals in a football match.

Goals are discrete, non-negative count data — a Poisson distribution is the
statistically correct choice over linear/Gaussian regression for this target.

Feature schema (one row per team per match):
    elo_diff        : team Elo − opponent Elo  (pre-match)
    is_home         : 1 if playing at home on non-neutral ground, else 0
    recency_weight  : 2.0 for matches within the last 2 years, else 1.0
                      (used as freq_weights in the GLM, not as a feature)
"""

import numpy as np
import pandas as pd
import statsmodels.api as sm

from backend.ml.elo import DEFAULT_RATING

# Column order must stay in sync with train_model / predict_goals.
_FEATURE_COLS = ["elo_diff", "is_home"]


def build_training_data(elo_history_df: pd.DataFrame) -> pd.DataFrame:
    """Return a model-ready DataFrame with one row per team per match.

    Uses *pre-match* Elo ratings from elo_history_df (not final ratings)
    so the model learns from historically accurate strength differences.
    """
    df = elo_history_df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["elo_diff"] = df["rating"] - df["opponent_rating"]

    cutoff = df["date"].max() - pd.DateOffset(years=2)
    df["recency_weight"] = np.where(df["date"] >= cutoff, 2.0, 1.0)

    return df[["date", "team", "goals_for", "elo_diff", "is_home", "recency_weight"]].copy()


def train_model(training_df: pd.DataFrame):
    """Fit a Poisson GLM and return the statsmodels results object.

    Recent matches receive double weight (freq_weights) so the model
    is biased toward current team strength rather than decade-old results.
    """
    X = sm.add_constant(training_df[_FEATURE_COLS].astype(float))
    y = training_df["goals_for"].astype(float)
    weights = training_df["recency_weight"].astype(float)

    glm = sm.GLM(y, X, family=sm.families.Poisson(), freq_weights=weights)
    return glm.fit()


def predict_goals(
    model,
    elo_ratings: dict[str, float],
    team_a: str,
    team_b: str,
    neutral: bool = True,
) -> tuple[float, float]:
    """Return (expected_goals_a, expected_goals_b) for a hypothetical match.

    Parameters
    ----------
    neutral : if False, team_a is treated as the home side.
    """
    elo_a = elo_ratings.get(team_a, DEFAULT_RATING)
    elo_b = elo_ratings.get(team_b, DEFAULT_RATING)
    is_home_a = 0 if neutral else 1

    X_a = pd.DataFrame(
        {"const": [1.0], "elo_diff": [elo_a - elo_b], "is_home": [float(is_home_a)]}
    )
    X_b = pd.DataFrame(
        {"const": [1.0], "elo_diff": [elo_b - elo_a], "is_home": [0.0]}
    )

    lambda_a = float(model.predict(X_a).iloc[0])
    lambda_b = float(model.predict(X_b).iloc[0])
    return lambda_a, lambda_b

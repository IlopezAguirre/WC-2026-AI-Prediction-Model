"""Backtest the Poisson GLM on the 2022 FIFA World Cup.

Computes multi-class log-loss (home win / draw / away win) and compares
against a naive uniform baseline of 1/3 probability per outcome.

Run from the project root:
    python backend/scripts/backtest.py
"""

import math
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import log_loss

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.db.queries import get_wc_matches
from backend.ml.model import predict_goals

MODEL_PATH = Path(__file__).parent.parent / "models" / "model.pkl"
MAX_GOALS = 9  # cap for Poisson summation; P(k >= 9) is negligible


def _poisson_pmf(k: int, lam: float) -> float:
    """Compute P(X = k) for X ~ Poisson(lam)."""
    return math.exp(-lam) * (lam**k) / math.factorial(k)


def match_probabilities(
    lambda_home: float, lambda_away: float
) -> tuple[float, float, float]:
    """Return (P_home_win, P_draw, P_away_win) via score-matrix summation."""
    p_home = p_draw = p_away = 0.0
    for i in range(MAX_GOALS + 1):
        pi = _poisson_pmf(i, lambda_home)
        for j in range(MAX_GOALS + 1):
            p_ij = pi * _poisson_pmf(j, lambda_away)
            if i > j:
                p_home += p_ij
            elif i == j:
                p_draw += p_ij
            else:
                p_away += p_ij

    # Renormalise to absorb truncation error (scores > MAX_GOALS)
    total = p_home + p_draw + p_away
    return p_home / total, p_draw / total, p_away / total


def actual_outcome(home_score: float, away_score: float) -> int:
    """Encode result as 0=home win, 1=draw, 2=away win."""
    if home_score > away_score:
        return 0
    if home_score == away_score:
        return 1
    return 2


def main() -> None:
    """Load model, run predictions on WC2022 matches, print log-loss."""
    if not MODEL_PATH.exists():
        print(f"ERROR: {MODEL_PATH} not found — run `python -m backend.ml.train` first.")
        sys.exit(1)

    bundle = joblib.load(MODEL_PATH)
    model = bundle["model"]
    elo_ratings = bundle["elos"]

    wc_matches = get_wc_matches(from_date="2022-11-20")
    if wc_matches.empty:
        print("No 2022 World Cup matches found in database.")
        sys.exit(1)

    print(f"Backtesting on {len(wc_matches)} FIFA World Cup 2022 matches…\n")

    y_true: list[int] = []
    y_pred: list[list[float]] = []
    naive_pred: list[list[float]] = []

    rows = []
    for _, row in wc_matches.iterrows():
        lambda_h, lambda_a = predict_goals(
            model,
            elo_ratings,
            row["home_team"],
            row["away_team"],
            neutral=bool(row["neutral"]),
        )
        ph, pd_, pa = match_probabilities(lambda_h, lambda_a)
        outcome = actual_outcome(row["home_score"], row["away_score"])

        y_true.append(outcome)
        y_pred.append([ph, pd_, pa])
        naive_pred.append([1 / 3, 1 / 3, 1 / 3])

        label = ["H", "D", "A"][outcome]
        rows.append(
            {
                "Match": f"{row['home_team']} vs {row['away_team']}",
                "Result": label,
                "P(H)": f"{ph:.2f}",
                "P(D)": f"{pd_:.2f}",
                "P(A)": f"{pa:.2f}",
                "λ_H": f"{lambda_h:.2f}",
                "λ_A": f"{lambda_a:.2f}",
            }
        )

    model_loss = log_loss(y_true, y_pred, labels=[0, 1, 2])
    naive_loss = log_loss(y_true, naive_pred, labels=[0, 1, 2])
    improvement = (naive_loss - model_loss) / naive_loss * 100

    print(pd.DataFrame(rows).to_string(index=False))
    print("\n" + "=" * 55)
    print(f"  Poisson GLM log-loss  : {model_loss:.4f}")
    print(f"  Naive (1/3) log-loss  : {naive_loss:.4f}")
    print(f"  Improvement           : {improvement:+.1f}%")
    print("=" * 55)


if __name__ == "__main__":
    main()

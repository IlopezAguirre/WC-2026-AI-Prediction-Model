"""Training pipeline: compute Elos → build features → fit Poisson GLM → save model.

Run from the project root:
    python -m backend.ml.train
"""

from pathlib import Path

import joblib
import pandas as pd

from backend.db.schema import get_connection, init_db
from backend.ml.elo import (
    EXTERNAL_ELO_PATH,
    compute_all_elos,
    load_external_elos,
    save_elos_to_db,
)
from backend.ml.model import build_training_data, predict_goals, train_model

MODEL_PATH = Path(__file__).parent.parent / "models" / "model.pkl"


def main() -> None:
    """End-to-end training: load data → Elo → GLM → save bundle."""
    # ── 1. Ensure DB is populated ──────────────────────────────────────────
    init_db()

    conn = get_connection()

    matches_df = pd.read_sql(
        """
        SELECT *
        FROM   matches
        WHERE  home_score IS NOT NULL
          AND  away_score IS NOT NULL
        ORDER  BY date
        """,
        conn,
    )
    matches_df["home_score"] = pd.to_numeric(matches_df["home_score"], errors="coerce")
    matches_df["away_score"] = pd.to_numeric(matches_df["away_score"], errors="coerce")
    matches_df = matches_df.dropna(subset=["home_score", "away_score"])
    print(f"Loaded {len(matches_df):,} scored matches for training.")

    # ── 2. Compute Elo ratings ─────────────────────────────────────────────
    if EXTERNAL_ELO_PATH.exists():
        print("External eloratings.csv found — using variable-K Elo ratings…")
        current_ratings, elo_history_df = load_external_elos(matches_df)
    else:
        print("Computing Elo ratings (flat K=32)…")
        current_ratings, elo_history_df = compute_all_elos(matches_df)
    save_elos_to_db(conn, elo_history_df)
    print(f"Elo history: {len(elo_history_df):,} rows  |  {len(current_ratings):,} teams rated.")

    # ── 3. Build training data and fit model ───────────────────────────────
    print("Building training features…")
    training_df = build_training_data(elo_history_df)

    print("Fitting Poisson GLM…")
    model = train_model(training_df)

    # ── 4. Print diagnostics ───────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("MODEL SUMMARY")
    print("=" * 60)
    print(model.summary())

    print("\n" + "=" * 60)
    print("TOP 10 TEAMS BY CURRENT ELO")
    print("=" * 60)
    top_10 = sorted(current_ratings.items(), key=lambda x: x[1], reverse=True)[:10]
    for rank, (team, rating) in enumerate(top_10, start=1):
        print(f"  {rank:2}. {team:<25} {rating:,.1f}")

    print("\n" + "=" * 60)
    print("SAMPLE PREDICTIONS (neutral ground)")
    print("=" * 60)
    pairs = [
        ("Brazil", "Saudi Arabia"),
        ("France", "Argentina"),
        ("England", "San Marino"),
    ]
    for team_a, team_b in pairs:
        ga, gb = predict_goals(model, current_ratings, team_a, team_b)
        print(f"  {team_a} vs {team_b:20}  →  {ga:.2f} – {gb:.2f}")

    # ── 5. Save model bundle ───────────────────────────────────────────────
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    bundle = {"model": model, "elos": current_ratings}
    joblib.dump(bundle, MODEL_PATH)
    print(f"\nModel bundle saved → {MODEL_PATH}")

    conn.close()


if __name__ == "__main__":
    main()

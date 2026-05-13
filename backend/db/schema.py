"""Database initialization: create tables and load raw CSV data."""

from pathlib import Path
import sqlite3
import pandas as pd

DB_PATH = Path(__file__).parent.parent / "data" / "wc2026.db"
RAW_DIR = Path(__file__).parent.parent / "data" / "raw"

_CREATE_ELO_HISTORY = """
CREATE TABLE IF NOT EXISTS elo_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    date          TEXT    NOT NULL,
    team          TEXT    NOT NULL,
    rating        REAL    NOT NULL,
    opponent      TEXT,
    opponent_rating REAL,
    goals_for     INTEGER,
    goals_against INTEGER,
    is_home       INTEGER
)
"""


def get_connection() -> sqlite3.Connection:
    """Return an open SQLite connection to the project database."""
    return sqlite3.connect(DB_PATH)


def _load_csv_data(conn: sqlite3.Connection) -> None:
    """Load the three raw CSV files into SQLite, replacing any existing data."""
    results = pd.read_csv(RAW_DIR / "results.csv")
    results["neutral"] = results["neutral"].astype(int)
    results.to_sql("matches", conn, if_exists="replace", index=False)

    goalscorers = pd.read_csv(RAW_DIR / "goalscorers.csv")
    goalscorers.to_sql("goalscorers", conn, if_exists="replace", index=False)

    shootouts = pd.read_csv(RAW_DIR / "shootouts.csv")
    shootouts.to_sql("shootouts", conn, if_exists="replace", index=False)

    conn.commit()


def init_db() -> None:
    """Create tables and load CSV data if not already present."""
    conn = get_connection()
    conn.execute(_CREATE_ELO_HISTORY)
    conn.commit()

    tables = {
        r[0]
        for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    }

    needs_load = "matches" not in tables or (
        conn.execute("SELECT COUNT(*) FROM matches").fetchone()[0] == 0
    )

    if needs_load:
        _load_csv_data(conn)
        row_count = conn.execute("SELECT COUNT(*) FROM matches").fetchone()[0]
        print(f"Database initialized: {row_count:,} matches loaded.")
    else:
        row_count = conn.execute("SELECT COUNT(*) FROM matches").fetchone()[0]
        print(f"Database already contains {row_count:,} matches.")

    conn.close()


if __name__ == "__main__":
    init_db()

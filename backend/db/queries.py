"""Reusable query helpers for the WC2026 database."""

import pandas as pd

from backend.db.schema import get_connection


def get_all_matches() -> pd.DataFrame:
    """Return every match row ordered by date."""
    conn = get_connection()
    df = pd.read_sql("SELECT * FROM matches ORDER BY date", conn)
    conn.close()
    return df


def get_matches_for_training() -> pd.DataFrame:
    """Return matches that have valid scores (excludes future/cancelled fixtures)."""
    conn = get_connection()
    df = pd.read_sql(
        """
        SELECT *
        FROM   matches
        WHERE  home_score IS NOT NULL
          AND  away_score IS NOT NULL
        ORDER  BY date
        """,
        conn,
    )
    conn.close()
    return df


def get_wc_matches(from_date: str = "2022-11-20") -> pd.DataFrame:
    """Return FIFA World Cup matches on or after *from_date*."""
    conn = get_connection()
    df = pd.read_sql(
        """
        SELECT *
        FROM   matches
        WHERE  tournament = 'FIFA World Cup'
          AND  date >= ?
          AND  home_score IS NOT NULL
          AND  away_score IS NOT NULL
        ORDER  BY date
        """,
        conn,
        params=(from_date,),
    )
    conn.close()
    return df

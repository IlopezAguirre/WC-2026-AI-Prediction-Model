"""Fetch finished WC 2026 fixtures from API-Football."""

import os

import httpx
from dotenv import load_dotenv

load_dotenv()

_API_KEY = os.getenv("API_FOOTBALL_KEY", "")
_BASE_URL = "https://v3.football.api-sports.io"


async def fetch_finished_matches(league: int = 1, season: int = 2026) -> list[dict]:
    if not _API_KEY:
        return []
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_BASE_URL}/fixtures",
            headers={"x-apisports-key": _API_KEY},
            params={"league": league, "season": season, "status": "FT"},
        )
        resp.raise_for_status()
    return resp.json().get("response", [])

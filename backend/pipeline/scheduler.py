"""APScheduler: poll API-Football every 5 minutes and push new results."""

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from backend.pipeline.fetcher import fetch_finished_matches
from backend.pipeline.updater import update_and_broadcast

_scheduler = AsyncIOScheduler()
_seen: set[int] = set()


async def _poll() -> None:
    fixtures = await fetch_finished_matches()
    for fix in fixtures:
        fid: int = fix["fixture"]["id"]
        if fid in _seen:
            continue
        _seen.add(fid)
        home: str = fix["teams"]["home"]["name"]
        away: str = fix["teams"]["away"]["name"]
        h_goals = fix["goals"]["home"]
        a_goals = fix["goals"]["away"]
        if h_goals is not None and a_goals is not None:
            await update_and_broadcast(home, away, int(h_goals), int(a_goals))


def start_scheduler() -> None:
    _scheduler.add_job(_poll, "interval", minutes=5, id="wc2026_poll")
    _scheduler.start()


def stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)

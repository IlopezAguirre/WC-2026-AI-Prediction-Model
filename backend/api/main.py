"""FastAPI application — WC 2026 Tournament Predictor API."""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.api import routes
from backend.api.routes import matches, predictions, standings
from backend.api.websocket import manager
from backend.data.wc2026_groups import WC2026_GROUPS
from backend.ml.simulator import CACHE_PATH, simulate_tournament
from backend.pipeline.scheduler import start_scheduler, stop_scheduler

_MODEL_PATH = Path(__file__).parent.parent / "models" / "model.pkl"
_executor = ThreadPoolExecutor(max_workers=1)


def _blocking_simulate() -> None:
    bundle = joblib.load(_MODEL_PATH)
    simulate_tournament(bundle["model"], bundle["elos"], WC2026_GROUPS, n=10_000, save=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not CACHE_PATH.exists():
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(_executor, _blocking_simulate)
    start_scheduler()
    yield
    stop_scheduler()
    _executor.shutdown(wait=False)


app = FastAPI(title="WC 2026 Predictor API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predictions.router, prefix="/api")
app.include_router(matches.router, prefix="/api")
app.include_router(standings.router, prefix="/api")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

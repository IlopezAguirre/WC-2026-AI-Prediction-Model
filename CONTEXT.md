# WC2026 AI Prediction Model — Session Context

## What this project is
A live FIFA World Cup 2026 prediction dashboard (portfolio/resume project).

- Computes Elo ratings for all 48 WC2026 teams from 150 years of match history
- Trains a Poisson GLM to predict expected goals for any matchup
- Runs 10,000 Monte Carlo simulations of the full 48-team bracket
- Ingests live match results and re-simulates automatically
- FastAPI backend with WebSocket support
- React + Vite + Tailwind frontend dashboard

---

## Tech stack
| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, SQLite, statsmodels, scikit-learn, joblib |
| ML | Elo (pure math), Poisson GLM (statsmodels), Monte Carlo simulation |
| Frontend | React, Vite, Tailwind CSS, Recharts |
| Deploy | Docker, Railway (backend), Vercel (frontend), GitHub Actions |

---

## Project structure
```
wc2026-predictor/
├── conftest.py                  ← pytest sys.path fix (project root)
├── backend/
│   ├── db/
│   │   ├── schema.py            ← get_connection(), init_db()
│   │   └── queries.py           ← get_all_matches(), get_wc_matches()
│   ├── ml/
│   │   ├── elo.py               ← expected_score, update_elo, compute_all_elos
│   │   ├── model.py             ← build_training_data, train_model, predict_goals
│   │   ├── train.py             ← full pipeline orchestrator → saves model.pkl
│   │   └── simulator.py         ← NOT YET WRITTEN (Phase 3)
│   ├── api/
│   │   ├── main.py              ← NOT YET WRITTEN (Phase 3)
│   │   ├── websocket.py         ← NOT YET WRITTEN (Phase 3)
│   │   └── routes/
│   │       ├── matches.py       ← NOT YET WRITTEN (Phase 3)
│   │       ├── predictions.py   ← NOT YET WRITTEN (Phase 3)
│   │       └── standings.py     ← NOT YET WRITTEN (Phase 3)
│   ├── pipeline/
│   │   ├── fetcher.py           ← NOT YET WRITTEN (Phase 3)
│   │   ├── updater.py           ← NOT YET WRITTEN (Phase 3)
│   │   └── scheduler.py        ← NOT YET WRITTEN (Phase 3)
│   ├── data/
│   │   ├── raw/                 ← results.csv, goalscorers.csv, shootouts.csv
│   │   ├── cache/               ← simulation JSON output goes here
│   │   └── wc2026.db           ← SQLite (49,287 matches loaded)
│   ├── models/
│   │   └── model.pkl            ← saved bundle: {"model": GLM, "elos": dict}
│   ├── scripts/
│   │   └── backtest.py          ← WC2022 log-loss evaluation
│   └── tests/
│       ├── test_elo.py          ← 9 tests, all passing
│       ├── test_model.py        ← 6 tests, all passing
│       └── test_simulator.py    ← NOT YET WRITTEN (Phase 3)
└── frontend/
    └── src/
        ├── components/          ← NOT YET WRITTEN (Phase 3)
        ├── hooks/               ← NOT YET WRITTEN (Phase 3)
        └── api/                 ← NOT YET WRITTEN (Phase 3)
```

---

## Completed phases

### Phase 1 — Setup (done)
- GitHub repo created, folder structure created
- Python venv set up with all dependencies installed
- Kaggle dataset downloaded: `results.csv` (49k+ matches), `goalscorers.csv`, `shootouts.csv`

### Phase 2 — ML Pipeline (done)
All files written, tested, and validated.

**Key run commands (from project root):**
```bash
python -m backend.ml.train                        # train + save model.pkl
python3 -m pytest backend/tests/test_elo.py -v   # 9 unit tests
python3 -m pytest backend/tests/test_model.py -v  # 6 integration tests
python3 backend/scripts/backtest.py               # WC2022 log-loss
```
> Note: `pytest` must be installed: `pip3 install pytest`

**Validated results:**
- 49,215 scored matches processed, 333 teams rated
- Top 10 Elo: Spain (2064), Argentina (2050), France (2018), Portugal (1947), England (1941), Germany (1938), Brazil (1937), Netherlands (1936), Colombia (1924), Japan (1914)
- `predict_goals("Brazil", "Saudi Arabia")` → 2.23 – 0.64
- `predict_goals("France", "Argentina")` → 1.11 – 1.28 *(Argentina rates higher post-WC2022)*
- GLM coefficients: `elo_diff` = +0.0022 ✓, `is_home` = +0.29 ✓ (both significant, p < 0.001)
- WC2022 backtest log-loss: 0.974 vs naive 1.099 → **+11.3% improvement**

---

## Important design decisions made

1. **`build_training_data(elo_history_df)`** takes the history df (not a `dict` of final ratings) — uses *pre-match* Elo so the model learns from historically accurate strength differences.

2. **`elo_history_df` columns**: `date, team, rating, opponent, opponent_rating, goals_for, goals_against, is_home` — `is_home=1` only when the team is the home side on non-neutral ground.

3. **Poisson GLM features**: `elo_diff` (team − opponent pre-match Elo) + `is_home`. `recency_weight` (2× for last 2 years) is a `freq_weights` sample weight, not a feature column.

4. **Known model limitation**: Very large Elo gaps produce unrealistic lambda values (e.g., England vs San Marino → 9.2 goals). This is a Poisson extrapolation problem worth discussing as a portfolio talking point.

5. **`predict_goals(model, elos, team_a, team_b, neutral=True)`**: `neutral=False` means `team_a` is the home side. Unknown teams fall back to `DEFAULT_RATING = 1500`.

---

## Phase 3 — What to build next

### 1. `backend/ml/simulator.py`
- `simulate_match(model, elos, team_a, team_b, neutral)` — sample from Poisson distributions, handle draws with extra time + penalties
- `simulate_group_stage(model, elos, groups_dict)` — run all group stage matches, return standings
- `simulate_knockout(model, elos, bracket)` — run knockout rounds
- `simulate_tournament(model, elos, groups_dict, n=10_000)` — run N full simulations, return win probability dict
- Save simulation output as JSON to `backend/data/cache/simulation.json`

### 2. `backend/pipeline/fetcher.py`
- Fetch live match results from an API (or scrape) during the tournament
- Store new results in SQLite

### 3. `backend/pipeline/updater.py`
- On new result: update Elo ratings, retrain model (or update incrementally), re-run simulation
- Save updated simulation cache

### 4. `backend/pipeline/scheduler.py`
- APScheduler job: poll for new results every N minutes during the tournament

### 5. `backend/api/main.py` + routes
- `GET /api/predictions` — return current win probabilities from simulation cache
- `GET /api/standings` — current group standings
- `GET /api/matches` — upcoming and completed matches
- `WebSocket /ws/live` — push updates when simulation reruns

### 6. Frontend React dashboard
- Group standings table
- Knockout bracket visualization
- Win probability bar chart (Recharts)
- Live update via WebSocket

---

## WC2026 tournament structure
- 48 teams (expanded from 32), 16 groups of 3 teams each
- Top 2 from each group + 8 best third-place teams advance to Round of 32
- Single-elimination knockout from Round of 32 onward
- Host nations: USA, Canada, Mexico

---

## Known issues / TODOs
- `test_simulator.py` is an empty placeholder — write when simulator.py is built
- The `model.pkl` must be regenerated if `results.csv` is updated with 2026 pre-tournament results
- No CI/CD pipeline yet (GitHub Actions workflow not written)
- Docker setup exists (`Dockerfile`, `docker-compose.yml`) but not verified

---

## Environment notes
- Python 3.11.9 via pyenv
- All ML dependencies installed globally (statsmodels 0.14.6, scikit-learn 1.8.0, joblib 1.5.3)
- `pytest` installed globally via `pip3 install pytest`
- Project root: `/Users/hello/Desktop/AI engineer/WC-2026-AI-Prediction-Model`
- Git user: Ian Lopez
- Branch: `main`

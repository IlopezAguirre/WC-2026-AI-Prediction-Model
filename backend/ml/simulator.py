"""Monte Carlo tournament simulator for WC 2026.

Uses the Poisson GLM + Elo bundle to simulate individual matches,
group stages, knockout rounds, and full 48-team tournaments via
repeated random sampling.
"""

import json
import random
from pathlib import Path

import numpy as np

from backend.ml.model import predict_goals

CACHE_PATH = Path(__file__).parent.parent / "data" / "cache" / "simulation.json"


def simulate_match(
    model,
    elos: dict[str, float],
    team_a: str,
    team_b: str,
    neutral: bool = True,
    knockout: bool = False,
) -> tuple[int, int]:
    """Return sampled (goals_a, goals_b) drawn from Poisson(lambda).

    In knockout mode, draws are resolved: 30% extra time (one random
    goal added), 70% penalties (coin flip adds one goal to winner).
    """
    lambda_a, lambda_b = predict_goals(model, elos, team_a, team_b, neutral)
    goals_a = int(np.random.poisson(lambda_a))
    goals_b = int(np.random.poisson(lambda_b))

    if knockout and goals_a == goals_b:
        if random.random() < 0.30:  # extra time resolves it
            if random.random() < 0.5:
                goals_a += 1
            else:
                goals_b += 1
        else:  # penalties: coin flip
            if random.random() < 0.5:
                goals_a += 1
            else:
                goals_b += 1

    return goals_a, goals_b


def _sort_standings(team_stats: list[dict]) -> list[dict]:
    return sorted(
        team_stats,
        key=lambda t: (t["points"], t["gd"], t["gf"]),
        reverse=True,
    )


def simulate_group_stage(
    model,
    elos: dict[str, float],
    groups_dict: dict[str, list[str]],
) -> dict[str, list[dict]]:
    """Simulate all group stage matches and return standings per group.

    Each team plays every other team in its group once (round-robin).
    Standings sorted by points → goal difference → goals scored.

    Returns
    -------
    dict mapping group name → list of team stat dicts, best-first.
    Each dict has keys: team, points, gf, ga, gd.
    """
    standings = {}

    for group_name, teams in groups_dict.items():
        stats = {
            team: {"team": team, "points": 0, "gf": 0, "ga": 0, "gd": 0}
            for team in teams
        }

        for i in range(len(teams)):
            for j in range(i + 1, len(teams)):
                team_a, team_b = teams[i], teams[j]
                ga, gb = simulate_match(model, elos, team_a, team_b, neutral=True)

                stats[team_a]["gf"] += ga
                stats[team_a]["ga"] += gb
                stats[team_b]["gf"] += gb
                stats[team_b]["ga"] += ga

                if ga > gb:
                    stats[team_a]["points"] += 3
                elif ga == gb:
                    stats[team_a]["points"] += 1
                    stats[team_b]["points"] += 1
                else:
                    stats[team_b]["points"] += 3

        for t in stats.values():
            t["gd"] = t["gf"] - t["ga"]

        standings[group_name] = _sort_standings(list(stats.values()))

    return standings


def simulate_knockout(
    model,
    elos: dict[str, float],
    bracket: list[tuple[str, str]],
) -> str:
    """Single-elimination knockout from a given bracket.

    Parameters
    ----------
    bracket : list of (team_a, team_b) pairs representing the first round.

    Returns the name of the tournament winner.
    """
    current_round = list(bracket)

    while current_round:
        winners = []
        for team_a, team_b in current_round:
            ga, gb = simulate_match(
                model, elos, team_a, team_b, neutral=True, knockout=True
            )
            winners.append(team_a if ga > gb else team_b)

        if len(winners) == 1:
            return winners[0]

        current_round = [
            (winners[i], winners[i + 1]) for i in range(0, len(winners), 2)
        ]

    raise RuntimeError("simulate_knockout called with an empty bracket")


def _build_r32_bracket(
    group_winners: list[str],
    group_runners_up: list[str],
    best_third: list[str],
) -> list[tuple[str, str]]:
    """Pair 32 qualifiers into 16 R32 matchups using seed-based draw.

    Seeds 1-16  : 12 group winners + top 4 runners-up (strongest half)
    Seeds 17-32 : remaining 8 runners-up + 8 best third-place teams

    Seed 1 faces seed 32, seed 2 faces seed 31, etc.
    """
    top_seeds = group_winners + group_runners_up[:4]   # 16 teams
    low_seeds = (group_runners_up[4:] + best_third)[::-1]  # 16 teams, flipped
    return list(zip(top_seeds, low_seeds))


def simulate_tournament(
    model,
    elos: dict[str, float],
    groups_dict: dict[str, list[str]],
    n: int = 10_000,
    save: bool = True,
) -> dict[str, dict[str, float]]:
    """Run n full WC 2026 simulations and return advancement probabilities.

    Tournament structure per WC 2026 rules:
      - 12 groups of 4, top 2 per group (24) + 8 best third-place = 32 advance
      - Single elimination: R32 → R16 → QF → SF → Final

    Returns
    -------
    {team: {"winner": p, "final": p, "semi": p, "quarter": p}}
    where p is the fraction of n simulations reaching that stage.

    If save=True, writes results to CACHE_PATH.
    """
    all_teams = [t for teams in groups_dict.values() for t in teams]
    counts: dict[str, dict[str, int]] = {
        team: {"winner": 0, "final": 0, "semi": 0, "quarter": 0}
        for team in all_teams
    }

    for _ in range(n):
        # ── Group stage ────────────────────────────────────────────────────
        standings = simulate_group_stage(model, elos, groups_dict)

        group_winners: list[str] = []
        group_runners_up: list[str] = []
        third_place_pool: list[dict] = []

        for group_name in sorted(standings.keys()):
            s = standings[group_name]
            group_winners.append(s[0]["team"])
            group_runners_up.append(s[1]["team"])
            third_place_pool.append(s[2])

        best_third = [
            t["team"]
            for t in sorted(
                third_place_pool,
                key=lambda t: (t["points"], t["gd"], t["gf"]),
                reverse=True,
            )[:8]
        ]

        bracket = _build_r32_bracket(group_winners, group_runners_up, best_third)

        # ── Round of 32 → Round of 16 ─────────────────────────────────────
        r16: list[str] = []
        for team_a, team_b in bracket:
            ga, gb = simulate_match(
                model, elos, team_a, team_b, neutral=True, knockout=True
            )
            r16.append(team_a if ga > gb else team_b)

        # ── Round of 16 → Quarter-finals ──────────────────────────────────
        qf: list[str] = []
        for i in range(0, len(r16), 2):
            ga, gb = simulate_match(
                model, elos, r16[i], r16[i + 1], neutral=True, knockout=True
            )
            qf.append(r16[i] if ga > gb else r16[i + 1])

        for team in qf:
            counts[team]["quarter"] += 1

        # ── Quarter-finals → Semi-finals ──────────────────────────────────
        sf: list[str] = []
        for i in range(0, len(qf), 2):
            ga, gb = simulate_match(
                model, elos, qf[i], qf[i + 1], neutral=True, knockout=True
            )
            sf.append(qf[i] if ga > gb else qf[i + 1])

        for team in sf:
            counts[team]["semi"] += 1

        # ── Semi-finals → Final ───────────────────────────────────────────
        finalists: list[str] = []
        for i in range(0, len(sf), 2):
            ga, gb = simulate_match(
                model, elos, sf[i], sf[i + 1], neutral=True, knockout=True
            )
            finalists.append(sf[i] if ga > gb else sf[i + 1])

        for team in finalists:
            counts[team]["final"] += 1

        # ── Final ─────────────────────────────────────────────────────────
        ga, gb = simulate_match(
            model, elos, finalists[0], finalists[1], neutral=True, knockout=True
        )
        champion = finalists[0] if ga > gb else finalists[1]
        counts[champion]["winner"] += 1

    results = {
        team: {stage: round(c / n, 4) for stage, c in stage_counts.items()}
        for team, stage_counts in counts.items()
    }

    if save:
        save_simulation(results)

    return results


def save_simulation(results: dict[str, dict[str, float]]) -> None:
    """Persist simulation results to backend/data/cache/simulation.json."""
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_PATH, "w") as f:
        json.dump(results, f, indent=2)

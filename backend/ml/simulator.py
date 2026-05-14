"""Monte Carlo tournament simulator for WC 2026.

Uses the Poisson GLM + Elo bundle to simulate individual matches,
group stages, knockout rounds, and full tournaments via repeated random
sampling. The bracket automatically scales to any number of groups by
padding to the next power of 2 with the best third-place teams — which
is exactly how the real WC 2026 works (12 groups → 24 + 8 = 32 teams).
"""

import json
import math
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


def _next_power_of_2(n: int) -> int:
    """Return the smallest power of 2 that is >= n."""
    return 1 if n <= 1 else 2 ** math.ceil(math.log2(n))


def _build_bracket(qualifiers: list[str]) -> list[tuple[str, str]]:
    """Seed-based bracket: top seed plays bottom seed.

    Seed 1 vs seed N, seed 2 vs seed N-1, etc.
    Requires an even-length qualifiers list.
    """
    n = len(qualifiers)
    return [(qualifiers[i], qualifiers[n - 1 - i]) for i in range(n // 2)]


def simulate_tournament(
    model,
    elos: dict[str, float],
    groups_dict: dict[str, list[str]],
    n: int = 10_000,
    save: bool = True,
) -> dict[str, dict[str, float]]:
    """Run n full tournament simulations and return advancement probabilities.

    Bracket size automatically scales to the number of groups:
      - 12 groups (WC 2026): 24 qualifiers + 8 best third-place = 32 teams
      - 4 groups (test):     8 qualifiers, no third-place needed
      - 3 groups (test):     6 qualifiers + 2 best third-place = 8 teams

    Stages are tracked by how many teams are competing in a round:
      quarter  — team played when 8 teams remained
      semi     — team played when 4 teams remained
      final    — team played in the 2-team final
      winner   — team won the final

    If save=True, writes results to CACHE_PATH.
    """
    all_teams = [t for teams in groups_dict.values() for t in teams]
    counts: dict[str, dict[str, int]] = {
        team: {"winner": 0, "final": 0, "semi": 0, "quarter": 0}
        for team in all_teams
    }

    n_groups = len(groups_dict)
    target = _next_power_of_2(2 * n_groups)
    n_third_needed = target - 2 * n_groups

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

        best_third: list[str] = []
        if n_third_needed > 0:
            best_third = [
                t["team"]
                for t in sorted(
                    third_place_pool,
                    key=lambda t: (t["points"], t["gd"], t["gf"]),
                    reverse=True,
                )[:n_third_needed]
            ]

        qualifiers = group_winners + group_runners_up + best_third
        current_round = _build_bracket(qualifiers)

        # ── Knockout rounds ────────────────────────────────────────────────
        while True:
            n_teams = len(current_round) * 2

            # Credit teams playing in rounds of known size
            if n_teams == 8:
                for team_a, team_b in current_round:
                    counts[team_a]["quarter"] += 1
                    counts[team_b]["quarter"] += 1
            elif n_teams == 4:
                for team_a, team_b in current_round:
                    counts[team_a]["semi"] += 1
                    counts[team_b]["semi"] += 1
            elif n_teams == 2:
                for team_a, team_b in current_round:
                    counts[team_a]["final"] += 1
                    counts[team_b]["final"] += 1

            winners: list[str] = []
            for team_a, team_b in current_round:
                ga, gb = simulate_match(
                    model, elos, team_a, team_b, neutral=True, knockout=True
                )
                winners.append(team_a if ga > gb else team_b)

            if len(winners) == 1:
                counts[winners[0]]["winner"] += 1
                break

            current_round = [
                (winners[i], winners[i + 1]) for i in range(0, len(winners), 2)
            ]

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

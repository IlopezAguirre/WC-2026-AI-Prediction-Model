import type { Match, Predictions, Standings } from '../types';

const BASE = '/api';

export const OFFICIAL_TEAMS: string[] = [
  // Group A
  'Mexico', 'South Korea', 'South Africa', 'Czech Republic',
  // Group B
  'Canada', 'Switzerland', 'Qatar', 'Bosnia and Herzegovina',
  // Group C
  'Brazil', 'Morocco', 'Scotland', 'Haiti',
  // Group D
  'USA', 'Paraguay', 'Australia', 'Turkey',
  // Group E
  'Germany', 'Ecuador', 'Ivory Coast', 'Curaçao',
  // Group F
  'Netherlands', 'Japan', 'Tunisia', 'Sweden',
  // Group G
  'Belgium', 'Iran', 'Egypt', 'New Zealand',
  // Group H
  'Spain', 'Uruguay', 'Saudi Arabia', 'Cape Verde',
  // Group I
  'France', 'Senegal', 'Norway', 'Iraq',
  // Group J
  'Argentina', 'Austria', 'Algeria', 'Jordan',
  // Group K
  'Portugal', 'Colombia', 'Uzbekistan', 'DR Congo',
  // Group L
  'England', 'Croatia', 'Panama', 'Ghana',
];

export async function fetchPredictions(): Promise<Predictions> {
  const res = await fetch(`${BASE}/predictions`);
  if (!res.ok) throw new Error(`predictions: ${res.status}`);
  return res.json() as Promise<Predictions>;
}

export async function fetchMatches(): Promise<Match[]> {
  const res = await fetch(`${BASE}/matches`);
  if (!res.ok) throw new Error(`matches: ${res.status}`);
  return res.json() as Promise<Match[]>;
}

export async function fetchStandings(): Promise<Standings> {
  const res = await fetch(`${BASE}/standings`);
  if (!res.ok) throw new Error(`standings: ${res.status}`);
  return res.json() as Promise<Standings>;
}

export async function simulateCustomGroups(
  groups: Record<string, string[]>,
): Promise<Predictions> {
  const res = await fetch(`${BASE}/simulate-custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groups }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error((err as { detail?: string }).detail ?? `simulate-custom: ${res.status}`);
  }
  return res.json() as Promise<Predictions>;
}

export function shuffleTeams(): Record<string, string[]> {
  const teams = [...OFFICIAL_TEAMS];
  for (let i = teams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }
  const groups: Record<string, string[]> = {};
  const letters = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  for (let i = 0; i < 12; i++) {
    groups[letters[i]] = teams.slice(i * 4, i * 4 + 4);
  }
  return groups;
}

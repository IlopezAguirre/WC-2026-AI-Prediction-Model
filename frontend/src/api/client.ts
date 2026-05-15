import type { Match, Predictions, Standings } from '../types';

const BASE = '/api';

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

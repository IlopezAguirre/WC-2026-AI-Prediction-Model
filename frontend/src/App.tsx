import { useEffect, useState } from 'react';
import type { Match, Predictions, Standings } from './types';
import { fetchMatches, fetchPredictions, fetchStandings } from './api/client';
import { GroupStandings } from './components/GroupStandings';
import { MatchCards } from './components/MatchCard';
import { ProbabilityTable } from './components/ProbabilityTable';
import { useWebSocket } from './hooks/useWebSocket';

type Tab = 'predictions' | 'matches' | 'standings';

export default function App() {
  const [tab, setTab] = useState<Tab>('predictions');
  const [predictions, setPredictions] = useState<Predictions | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [standings, setStandings] = useState<Standings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { predictions: livePredictions, connected } = useWebSocket();

  useEffect(() => {
    fetchPredictions()
      .then(setPredictions)
      .catch((e: unknown) => setError(String(e)));
    fetchMatches()
      .then(setMatches)
      .catch((e: unknown) => setError(String(e)));
    fetchStandings()
      .then(setStandings)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (livePredictions) setPredictions(livePredictions);
  }, [livePredictions]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">WC 2026 AI Predictor</h1>
          <p className="text-slate-400 text-sm">Monte Carlo · 10,000 simulations</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-600'}`}
          />
          <span className="text-slate-400">{connected ? 'Live' : 'Offline'}</span>
        </div>
      </header>

      <nav className="border-b border-slate-800 px-6 flex gap-1">
        {(['predictions', 'matches', 'standings'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-3 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <main className="px-6 py-6 max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {tab === 'predictions' &&
          (predictions ? (
            <ProbabilityTable predictions={predictions} />
          ) : (
            <p className="text-slate-500">Loading predictions…</p>
          ))}

        {tab === 'matches' &&
          (matches ? (
            <MatchCards matches={matches} />
          ) : (
            <p className="text-slate-500">Loading matches…</p>
          ))}

        {tab === 'standings' &&
          (standings ? (
            <GroupStandings standings={standings} />
          ) : (
            <p className="text-slate-500">Loading standings…</p>
          ))}
      </main>
    </div>
  );
}

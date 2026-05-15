import { useEffect, useState } from 'react';
import type { Match, Predictions, SimulationMode, Standings } from './types';
import {
  fetchMatches,
  fetchPredictions,
  fetchStandings,
  shuffleTeams,
  simulateCustomGroups,
} from './api/client';
import { CustomDrawEditor } from './components/CustomDrawEditor';
import { GroupStandings } from './components/GroupStandings';
import { MatchCards } from './components/MatchCard';
import { ProbabilityTable } from './components/ProbabilityTable';
import { useWebSocket } from './hooks/useWebSocket';

type Tab = 'predictions' | 'matches' | 'standings';

const MODE_LABELS: Record<SimulationMode, string> = {
  official: 'Official Draw',
  random: 'Random Shuffle',
  custom: 'Custom Draw',
};

export default function App() {
  const [tab, setTab] = useState<Tab>('predictions');
  const [mode, setMode] = useState<SimulationMode>('official');
  const [predictions, setPredictions] = useState<Predictions | null>(null);
  const [customPredictions, setCustomPredictions] = useState<Predictions | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [standings, setStandings] = useState<Standings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simNote, setSimNote] = useState<string | null>(null);

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
    if (livePredictions && mode === 'official') setPredictions(livePredictions);
  }, [livePredictions, mode]);

  function switchMode(m: SimulationMode) {
    setMode(m);
    setCustomPredictions(null);
    setSimNote(null);
    setError(null);
    setTab('predictions');
  }

  async function handleRandomShuffle() {
    setSimLoading(true);
    setError(null);
    try {
      const results = await simulateCustomGroups(shuffleTeams());
      setCustomPredictions(results);
      setSimNote('Randomized draw — not the official groups');
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setSimLoading(false);
    }
  }

  async function handleCustomSimulate(groups: Record<string, string[]>) {
    setSimLoading(true);
    setError(null);
    try {
      const results = await simulateCustomGroups(groups);
      setCustomPredictions(results);
      setSimNote('Custom draw simulation');
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setSimLoading(false);
    }
  }

  const shownPredictions =
    mode === 'official' ? (livePredictions ?? predictions) : customPredictions;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
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

      {/* Mode switcher */}
      <div className="border-b border-slate-800 px-6 py-3 flex gap-2">
        {(['official', 'random', 'custom'] as SimulationMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Tab nav */}
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
        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Simulation note */}
        {simNote && (
          <div className="mb-4 p-3 bg-slate-800 border border-slate-700 rounded text-slate-300 text-sm">
            {simNote}
          </div>
        )}

        {/* Loading spinner */}
        {simLoading && (
          <div className="mb-4 p-4 bg-slate-800 rounded flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-300 text-sm">Running 10,000 simulations…</span>
          </div>
        )}

        {/* Custom Draw: show editor until results arrive */}
        {mode === 'custom' && !customPredictions && !simLoading && (
          <CustomDrawEditor onSimulate={handleCustomSimulate} />
        )}

        {/* Random Shuffle: show shuffle button until results arrive */}
        {mode === 'random' && !customPredictions && !simLoading && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-slate-400 text-sm">
              Randomly redistribute all 48 qualified teams into 12 groups and run a full
              simulation.
            </p>
            <button
              onClick={handleRandomShuffle}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 rounded font-medium text-sm transition-colors"
            >
              Shuffle &amp; Simulate
            </button>
          </div>
        )}

        {/* Predictions tab */}
        {tab === 'predictions' && (mode === 'official' || customPredictions) && (
          shownPredictions ? (
            <ProbabilityTable predictions={shownPredictions} />
          ) : (
            <p className="text-slate-500">Loading predictions…</p>
          )
        )}

        {/* Matches tab — official data only */}
        {tab === 'matches' && mode === 'official' && (
          matches ? (
            <MatchCards matches={matches} />
          ) : (
            <p className="text-slate-500">Loading matches…</p>
          )
        )}
        {tab === 'matches' && mode !== 'official' && (
          <p className="text-slate-500 text-sm">
            Match schedule is available in Official Draw mode.
          </p>
        )}

        {/* Standings tab — official data only */}
        {tab === 'standings' && mode === 'official' && (
          standings ? (
            <GroupStandings standings={standings} />
          ) : (
            <p className="text-slate-500">Loading standings…</p>
          )
        )}
        {tab === 'standings' && mode !== 'official' && (
          <p className="text-slate-500 text-sm">
            Group standings are available in Official Draw mode.
          </p>
        )}
      </main>
    </div>
  );
}

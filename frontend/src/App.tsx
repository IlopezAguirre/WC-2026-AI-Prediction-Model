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

const TAB_LABELS: Record<Tab, string> = {
  predictions: 'Win Probabilities',
  matches: 'Match Predictions',
  standings: 'Group Standings',
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

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-slate-900">
        {/* Ambient glow blobs */}
        <div className="absolute -top-24 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-24 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />

        <div className="relative text-center px-6 pt-14 pb-12">
          <div className="text-5xl mb-3">🏆</div>
          <p className="text-emerald-400 text-xs font-bold tracking-[0.3em] uppercase mb-3">
            World Cup 2026
          </p>
          <h1 className="text-[clamp(3rem,10vw,7rem)] font-black tracking-tight text-white leading-none mb-5">
            PREDICTOR
          </h1>
          <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
            Monte Carlo simulation using Poisson GLM + Elo ratings.
            <br />
            10,000 scenarios per draw.
          </p>

          {/* Live indicator */}
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-full text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-slate-400">{connected ? 'Live updates on' : 'Live updates off'}</span>
          </div>
        </div>
      </div>

      {/* ── Mode Switcher ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {(['official', 'random', 'custom'] as SimulationMode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                  mode === m
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Tab nav right-aligned */}
          <div className="flex gap-1 border border-slate-700/60 rounded-lg p-0.5 bg-slate-800/60">
            {(['predictions', 'matches', 'standings'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  tab === t
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800/60 rounded-xl text-red-400 text-sm flex items-start gap-3">
            <span className="text-lg leading-none mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Sim note */}
        {simNote && (
          <div className="mb-6 p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-slate-400 text-sm flex items-center gap-2">
            <span>✦</span>
            <span>{simNote}</span>
          </div>
        )}

        {/* Loading state */}
        {simLoading && (
          <div className="mb-6 p-5 bg-slate-800 border border-slate-700/60 rounded-xl flex items-center gap-4">
            <div className="relative w-8 h-8 shrink-0">
              <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Running 10,000 simulations…</p>
              <p className="text-slate-500 text-xs mt-0.5">This takes about 30 seconds</p>
            </div>
          </div>
        )}

        {/* Custom Draw mode — show editor until results */}
        {mode === 'custom' && !customPredictions && !simLoading && (
          <CustomDrawEditor onSimulate={handleCustomSimulate} />
        )}

        {/* Random mode — show shuffle CTA until results */}
        {mode === 'random' && !customPredictions && !simLoading && (
          <div className="flex flex-col items-start gap-4 p-6 bg-slate-800/40 border border-slate-700/60 rounded-xl">
            <div>
              <h2 className="text-white font-bold text-lg mb-1">Random Draw</h2>
              <p className="text-slate-400 text-sm max-w-md">
                Randomly redistribute all 48 qualified teams into 12 groups of 4 and run a full
                Monte Carlo simulation. See how luck of the draw changes everything.
              </p>
            </div>
            <button
              onClick={handleRandomShuffle}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-emerald-500/20"
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
            <div className="text-center py-16 text-slate-600">
              <div className="text-4xl mb-3">⏳</div>
              <p>Loading predictions…</p>
            </div>
          )
        )}

        {/* Matches tab */}
        {tab === 'matches' && mode === 'official' && (
          matches ? (
            <MatchCards matches={matches} />
          ) : (
            <div className="text-center py-16 text-slate-600">
              <div className="text-4xl mb-3">⏳</div>
              <p>Loading matches…</p>
            </div>
          )
        )}
        {tab === 'matches' && mode !== 'official' && (
          <p className="text-slate-600 text-sm py-8">
            Match predictions are available in Official Draw mode.
          </p>
        )}

        {/* Standings tab */}
        {tab === 'standings' && mode === 'official' && (
          standings ? (
            <GroupStandings standings={standings} />
          ) : (
            <div className="text-center py-16 text-slate-600">
              <div className="text-4xl mb-3">⏳</div>
              <p>Loading standings…</p>
            </div>
          )
        )}
        {tab === 'standings' && mode !== 'official' && (
          <p className="text-slate-600 text-sm py-8">
            Group standings are available in Official Draw mode.
          </p>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-16 px-6 py-6 text-center text-slate-600 text-xs">
        Powered by Poisson GLM + Elo · 10,000 Monte Carlo simulations · WC 2026
      </footer>
    </div>
  );
}

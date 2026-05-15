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
import { FlagGrid } from './components/FlagGrid';
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
    fetchPredictions().then(setPredictions).catch((e: unknown) => setError(String(e)));
    fetchMatches().then(setMatches).catch((e: unknown) => setError(String(e)));
    fetchStandings().then(setStandings).catch((e: unknown) => setError(String(e)));
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
    <div className="min-h-screen bg-black text-white">

      {/* FIFA colour strip */}
      <div className="flex h-1">
        {['#CCFF00', '#00D4FF', '#E8002D', '#FF6B00', '#7B2FBE'].map((c) => (
          <div key={c} className="flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>

      {/* Hero */}
      <div className="relative bg-black overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
        >
          <span className="text-[35vw] font-black text-white opacity-[0.025] leading-none tracking-tighter">
            26
          </span>
        </div>

        <div className="relative text-center px-6 pt-12 pb-10">
          <p
            className="text-xs font-black tracking-[0.35em] uppercase mb-3"
            style={{ color: '#CCFF00' }}
          >
            FIFA · World Cup · 2026
          </p>
          <h1
            className="font-black uppercase leading-none tracking-tighter mb-5 text-white"
            style={{ fontSize: 'clamp(3.5rem, 14vw, 8.5rem)' }}
          >
            PREDICTOR
          </h1>
          <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">
            Monte Carlo simulation · Poisson GLM · Elo ratings
            <br />
            10,000 scenarios per draw
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 border border-zinc-800 text-[10px] font-black uppercase tracking-widest">
            <span
              className={`w-1.5 h-1.5 ${connected ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: connected ? '#CCFF00' : '#3f3f46' }}
            />
            <span className="text-zinc-500">{connected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Sticky nav */}
      <div className="sticky top-0 z-10 bg-black border-b border-zinc-900">
        <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 flex-wrap">
            {(['official', 'random', 'custom'] as SimulationMode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-colors ${
                  mode === m ? 'text-black' : 'border border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500'
                }`}
                style={mode === m ? { backgroundColor: '#CCFF00' } : {}}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          <div className="flex border border-zinc-800">
            {(['predictions', 'matches', 'standings'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                  tab === t ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-300'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {error && (
          <div
            className="mb-6 p-4 border text-sm flex items-start gap-3 font-bold"
            style={{ borderColor: '#E8002D', backgroundColor: 'rgba(232,0,45,0.07)', color: '#E8002D' }}
          >
            <span className="font-black text-base leading-none mt-0.5 shrink-0">!</span>
            {error}
          </div>
        )}

        {simNote && (
          <div className="mb-6 p-3 border border-zinc-800 bg-zinc-950 text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <span style={{ color: '#CCFF00' }}>◆</span>
            <span className="text-zinc-400">{simNote}</span>
          </div>
        )}

        {simLoading && (
          <div className="mb-6 p-5 bg-zinc-950 border border-zinc-800 flex items-center gap-4">
            <div className="relative w-8 h-8 shrink-0">
              <div className="absolute inset-0 border-2 border-zinc-800" />
              <div
                className="absolute inset-0 border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#CCFF00', borderTopColor: 'transparent' }}
              />
            </div>
            <div>
              <p className="text-white text-sm font-black uppercase tracking-wide">
                Running 10,000 simulations…
              </p>
              <p className="text-zinc-600 text-xs mt-0.5 uppercase tracking-wider font-bold">
                ~30 seconds
              </p>
            </div>
          </div>
        )}

        {mode === 'custom' && !customPredictions && !simLoading && (
          <CustomDrawEditor onSimulate={handleCustomSimulate} />
        )}

        {mode === 'random' && !customPredictions && !simLoading && (
          <div className="p-6 bg-zinc-950 border border-zinc-800">
            <h2 className="text-white font-black text-2xl uppercase tracking-tight mb-2">
              Random Draw
            </h2>
            <p className="text-zinc-500 text-sm max-w-md mb-6 leading-relaxed">
              Randomly redistribute all 48 qualified teams into 12 groups and run a full
              Monte Carlo simulation. See how the luck of the draw changes everything.
            </p>
            <button
              onClick={handleRandomShuffle}
              className="px-6 py-2.5 font-black text-sm uppercase tracking-wider text-black hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#CCFF00' }}
            >
              Shuffle &amp; Simulate
            </button>
          </div>
        )}

        {tab === 'predictions' && (mode === 'official' || customPredictions) && (
          shownPredictions ? (
            <ProbabilityTable predictions={shownPredictions} />
          ) : (
            <div className="text-center py-20 text-zinc-700 font-black uppercase tracking-widest text-xs">
              Loading…
            </div>
          )
        )}

        {tab === 'matches' && mode === 'official' && (
          matches ? (
            <MatchCards matches={matches} />
          ) : (
            <div className="text-center py-20 text-zinc-700 font-black uppercase tracking-widest text-xs">
              Loading…
            </div>
          )
        )}
        {tab === 'matches' && mode !== 'official' && (
          <p className="text-zinc-700 text-xs font-black uppercase tracking-widest py-12">
            Match predictions available in Official Draw mode.
          </p>
        )}

        {tab === 'standings' && mode === 'official' && (
          standings ? (
            <GroupStandings standings={standings} />
          ) : (
            <div className="text-center py-20 text-zinc-700 font-black uppercase tracking-widest text-xs">
              Loading…
            </div>
          )
        )}
        {tab === 'standings' && mode !== 'official' && (
          <p className="text-zinc-700 text-xs font-black uppercase tracking-widest py-12">
            Group standings available in Official Draw mode.
          </p>
        )}

        <FlagGrid />
      </main>

      <footer className="border-t border-zinc-900 mt-16 px-6 py-6 text-center">
        <p className="text-zinc-700 text-[10px] font-black uppercase tracking-widest">
          Poisson GLM + Elo · 10,000 Monte Carlo Simulations · WC 2026
        </p>
      </footer>
    </div>
  );
}

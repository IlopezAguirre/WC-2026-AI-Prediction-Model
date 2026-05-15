import type { Predictions } from '../types';
import { flag } from '../utils/flags';

interface Props {
  predictions: Predictions;
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

function winColorClass(n: number): string {
  if (n >= 0.15) return 'text-emerald-400';
  if (n >= 0.08) return 'text-yellow-400';
  if (n >= 0.03) return 'text-slate-300';
  return 'text-slate-500';
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function ProbabilityTable({ predictions }: Props) {
  const rows = Object.entries(predictions).sort(([, a], [, b]) => b.winner - a.winner);
  const maxWin = rows[0]?.[1].winner ?? 1;

  return (
    <div>
      {/* Column headers */}
      <div className="grid grid-cols-[32px_1fr_72px_72px_72px_72px] gap-x-3 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-700/60 mb-1">
        <span />
        <span>Team</span>
        <span className="text-right">Win</span>
        <span className="text-right">Final</span>
        <span className="text-right">Semi</span>
        <span className="text-right">QF</span>
      </div>

      {rows.map(([team, probs], idx) => {
        const barPct = (probs.winner / maxWin) * 100;

        return (
          <div
            key={team}
            className="relative grid grid-cols-[32px_1fr_72px_72px_72px_72px] gap-x-3 items-center px-4 py-3 rounded-lg hover:bg-slate-800/60 transition-colors group"
          >
            {/* Win probability bar — behind content */}
            <div
              className="absolute inset-y-1 left-0 rounded-lg bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-all pointer-events-none"
              style={{ width: `${barPct}%` }}
            />

            {/* Rank / medal */}
            <span className="relative text-center text-sm select-none">
              {idx < 3 ? MEDALS[idx] : (
                <span className="text-slate-600 tabular-nums">{idx + 1}</span>
              )}
            </span>

            {/* Flag + team name */}
            <div className="relative flex items-center gap-2 min-w-0">
              <span className="text-lg leading-none shrink-0">{flag(team)}</span>
              <span className="text-white text-sm font-medium truncate">{team}</span>
            </div>

            {/* Win % */}
            <span className={`relative text-right text-sm font-bold tabular-nums ${winColorClass(probs.winner)}`}>
              {pct(probs.winner)}
            </span>

            {/* Final % */}
            <span className="relative text-right text-sm tabular-nums text-slate-400">
              {pct(probs.final)}
            </span>

            {/* Semi % */}
            <span className="relative text-right text-sm tabular-nums text-slate-400">
              {pct(probs.semi)}
            </span>

            {/* QF % */}
            <span className="relative text-right text-sm tabular-nums text-slate-500">
              {pct(probs.quarter)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

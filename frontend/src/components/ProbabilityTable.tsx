import type { Predictions } from '../types';
import { FlagIcon } from '../utils/flags';

interface Props {
  predictions: Predictions;
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

function winColor(n: number): string {
  if (n >= 0.15) return '#CCFF00';
  if (n >= 0.08) return '#00D4FF';
  if (n >= 0.03) return '#ffffff';
  return '#52525b';
}

const RANK_COLORS = ['#CCFF00', '#00D4FF', '#E8002D'];

export function ProbabilityTable({ predictions }: Props) {
  const rows = Object.entries(predictions).sort(([, a], [, b]) => b.winner - a.winner);
  const maxWin = rows[0]?.[1].winner ?? 1;

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[40px_1fr_80px_80px_80px_80px] gap-x-3 px-4 py-3 border-b border-zinc-800 mb-1">
        {['', 'Team', 'Win', 'Final', 'Semi', 'QF'].map((h, i) => (
          <span
            key={h + i}
            className={`text-[10px] font-black text-zinc-600 uppercase tracking-widest ${i > 1 ? 'text-right' : ''}`}
          >
            {h}
          </span>
        ))}
      </div>

      {rows.map(([team, probs], idx) => {
        const barPct = (probs.winner / maxWin) * 100;
        return (
          <div
            key={team}
            className="relative grid grid-cols-[40px_1fr_80px_80px_80px_80px] gap-x-3 items-center px-4 py-3 border-b border-zinc-900 hover:bg-zinc-950 transition-colors group"
          >
            {/* Win bar */}
            <div
              className="absolute inset-y-0 left-0 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity pointer-events-none"
              style={{ width: `${barPct}%`, backgroundColor: '#CCFF00' }}
            />

            {/* Rank badge */}
            <div className="relative flex justify-center">
              {idx < 3 ? (
                <span
                  className="inline-flex items-center justify-center w-6 h-6 text-xs font-black text-black"
                  style={{ backgroundColor: RANK_COLORS[idx] }}
                >
                  {idx + 1}
                </span>
              ) : (
                <span className="text-zinc-700 text-xs font-black tabular-nums">{idx + 1}</span>
              )}
            </div>

            {/* Flag + name */}
            <div className="relative flex items-center gap-2 min-w-0">
              <FlagIcon team={team} size={18} />
              <span className="text-white text-sm font-bold truncate">{team}</span>
            </div>

            {/* Win % */}
            <span
              className="relative text-right text-sm font-black tabular-nums"
              style={{ color: winColor(probs.winner) }}
            >
              {pct(probs.winner)}
            </span>

            <span className="relative text-right text-sm tabular-nums text-zinc-400 font-medium">
              {pct(probs.final)}
            </span>
            <span className="relative text-right text-sm tabular-nums text-zinc-500">
              {pct(probs.semi)}
            </span>
            <span className="relative text-right text-sm tabular-nums text-zinc-600">
              {pct(probs.quarter)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

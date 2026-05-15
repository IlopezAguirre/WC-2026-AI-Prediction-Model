import type { Predictions } from '../types';

interface Props {
  predictions: Predictions;
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

function winColor(n: number): string {
  if (n >= 0.15) return 'text-emerald-400 font-semibold';
  if (n >= 0.08) return 'text-yellow-400';
  return 'text-slate-400';
}

export function ProbabilityTable({ predictions }: Props) {
  const rows = Object.entries(predictions).sort(
    ([, a], [, b]) => b.winner - a.winner,
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
            <th className="py-2 pr-4">#</th>
            <th className="py-2 pr-8">Team</th>
            <th className="py-2 pr-6 text-right">Win</th>
            <th className="py-2 pr-6 text-right">Final</th>
            <th className="py-2 pr-6 text-right">Semi</th>
            <th className="py-2 text-right">QF</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([team, probs], idx) => (
            <tr key={team} className="border-b border-slate-800 hover:bg-slate-800/50">
              <td className="py-2 pr-4 text-slate-500">{idx + 1}</td>
              <td className="py-2 pr-8 text-white font-medium">{team}</td>
              <td className={`py-2 pr-6 text-right ${winColor(probs.winner)}`}>
                {pct(probs.winner)}
              </td>
              <td className="py-2 pr-6 text-right text-slate-300">{pct(probs.final)}</td>
              <td className="py-2 pr-6 text-right text-slate-300">{pct(probs.semi)}</td>
              <td className="py-2 text-right text-slate-300">{pct(probs.quarter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

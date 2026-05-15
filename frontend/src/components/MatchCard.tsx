import type { Match } from '../types';
import { flag } from '../utils/flags';

interface Props {
  matches: Match[];
}

function groupByGroup(matches: Match[]): Record<string, Match[]> {
  return matches.reduce<Record<string, Match[]>>((acc, m) => {
    (acc[m.group] ??= []).push(m);
    return acc;
  }, {});
}

export function MatchCards({ matches }: Props) {
  const byGroup = groupByGroup(matches);

  return (
    <div className="space-y-8">
      {Object.entries(byGroup)
        .sort()
        .map(([group, groupMatches]) => (
          <div key={group}>
            {/* Group label with divider */}
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider shrink-0">
                Group {group}
              </h3>
              <div className="h-px flex-1 bg-slate-700/60" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupMatches.map((m) => (
                <div
                  key={`${m.home}-${m.away}`}
                  className="bg-slate-800 rounded-xl border border-slate-700/60 p-4 hover:border-slate-600 transition-colors"
                >
                  {/* Home row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl leading-none shrink-0">{flag(m.home)}</span>
                      <span className="text-white text-sm font-medium truncate">{m.home}</span>
                    </div>
                    <span className="text-emerald-400 font-bold text-xl tabular-nums ml-3 shrink-0">
                      {m.predicted_home_goals.toFixed(1)}
                    </span>
                  </div>

                  {/* VS divider */}
                  <div className="relative my-3 border-t border-slate-700/60">
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 px-2 text-slate-600 text-[10px] uppercase tracking-widest">
                      vs
                    </span>
                  </div>

                  {/* Away row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl leading-none shrink-0">{flag(m.away)}</span>
                      <span className="text-white text-sm font-medium truncate">{m.away}</span>
                    </div>
                    <span className="text-emerald-400 font-bold text-xl tabular-nums ml-3 shrink-0">
                      {m.predicted_away_goals.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

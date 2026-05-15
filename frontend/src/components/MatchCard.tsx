import type { Match } from '../types';

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
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
              Group {group}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupMatches.map((m) => (
                <div
                  key={`${m.home}-${m.away}`}
                  className="bg-slate-800 rounded-lg p-4 flex items-center justify-between gap-2"
                >
                  <span className="text-white text-sm font-medium text-right flex-1">
                    {m.home}
                  </span>
                  <div className="text-center shrink-0">
                    <span className="text-emerald-400 font-bold text-lg">
                      {m.predicted_home_goals.toFixed(1)}
                    </span>
                    <span className="text-slate-500 mx-1">–</span>
                    <span className="text-emerald-400 font-bold text-lg">
                      {m.predicted_away_goals.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-white text-sm font-medium flex-1">{m.away}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

import type { Match } from '../types';
import { FlagIcon } from '../utils/flags';

interface Props {
  matches: Match[];
}

function groupByGroup(matches: Match[]): Record<string, Match[]> {
  return matches.reduce<Record<string, Match[]>>((acc, m) => {
    (acc[m.group] ??= []).push(m);
    return acc;
  }, {});
}

const GROUP_COLORS: Record<string, string> = {
  A: '#CCFF00', B: '#00D4FF', C: '#E8002D', D: '#FF6B00',
  E: '#7B2FBE', F: '#CCFF00', G: '#00D4FF', H: '#E8002D',
  I: '#FF6B00', J: '#7B2FBE', K: '#CCFF00', L: '#00D4FF',
};

export function MatchCards({ matches }: Props) {
  const byGroup = groupByGroup(matches);

  return (
    <div className="space-y-10">
      {Object.entries(byGroup)
        .sort()
        .map(([group, groupMatches]) => {
          const accent = GROUP_COLORS[group] ?? '#CCFF00';
          return (
            <div key={group}>
              {/* Group header */}
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="px-2 py-0.5 text-black text-[10px] font-black uppercase tracking-wider shrink-0"
                  style={{ backgroundColor: accent }}
                >
                  Group {group}
                </span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupMatches.map((m) => (
                  <div
                    key={`${m.home}-${m.away}`}
                    className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors overflow-hidden"
                  >
                    {/* Accent line */}
                    <div className="h-0.5" style={{ backgroundColor: accent }} />

                    <div className="p-4">
                      {/* Home */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <FlagIcon team={m.home} size={20} />
                          <span className="text-white text-sm font-bold truncate">{m.home}</span>
                        </div>
                        <span
                          className="font-black text-2xl tabular-nums ml-3 shrink-0"
                          style={{ color: accent }}
                        >
                          {m.predicted_home_goals.toFixed(1)}
                        </span>
                      </div>

                      <div className="border-t border-zinc-800 mb-3" />

                      {/* Away */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FlagIcon team={m.away} size={20} />
                          <span className="text-white text-sm font-bold truncate">{m.away}</span>
                        </div>
                        <span
                          className="font-black text-2xl tabular-nums ml-3 shrink-0"
                          style={{ color: accent }}
                        >
                          {m.predicted_away_goals.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}

import type { Standings } from '../types';
import { FlagIcon } from '../utils/flags';

interface Props {
  standings: Standings;
}

const GROUP_COLORS: Record<string, string> = {
  A: '#CCFF00', B: '#00D4FF', C: '#E8002D', D: '#FF6B00',
  E: '#7B2FBE', F: '#CCFF00', G: '#00D4FF', H: '#E8002D',
  I: '#FF6B00', J: '#7B2FBE', K: '#CCFF00', L: '#00D4FF',
};

export function GroupStandings({ standings }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Object.entries(standings)
        .sort()
        .map(([group, teams]) => {
          const accent = GROUP_COLORS[group] ?? '#CCFF00';
          return (
            <div key={group} className="bg-zinc-950 border border-zinc-800 overflow-hidden">
              {/* Colour stripe */}
              <div className="h-1" style={{ backgroundColor: accent }} />

              {/* Card header */}
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <span
                  className="text-black text-[10px] font-black px-2 py-0.5 uppercase tracking-wider"
                  style={{ backgroundColor: accent }}
                >
                  Group {group}
                </span>
                <div className="flex gap-1.5">
                  {teams.map((t) => (
                    <FlagIcon key={t.team} team={t.team} size={16} />
                  ))}
                </div>
              </div>

              {/* Team rows */}
              <div>
                {teams.map((t, i) => (
                  <div
                    key={t.team}
                    className={`flex items-center px-4 py-2.5 gap-3 border-b border-zinc-900 last:border-0 ${
                      i >= 2 ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Position badge */}
                    <div
                      className="w-5 h-5 flex items-center justify-center text-xs font-black shrink-0"
                      style={
                        i === 0
                          ? { backgroundColor: accent, color: '#000' }
                          : i === 1
                          ? { backgroundColor: '#3f3f46', color: '#fff' }
                          : { backgroundColor: '#27272a', color: '#52525b' }
                      }
                    >
                      {i + 1}
                    </div>

                    {/* Flag + name */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FlagIcon team={t.team} size={18} />
                      <span
                        className={`text-sm truncate font-bold ${
                          i < 2 ? 'text-white' : 'text-zinc-500'
                        }`}
                      >
                        {t.team}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span
                        className="font-black tabular-nums"
                        style={{ color: i < 2 ? accent : '#3f3f46' }}
                      >
                        {t.points}pt
                      </span>
                      <span className="text-zinc-700 tabular-nums w-7 text-right">
                        {t.gd > 0 ? `+${t.gd}` : t.gd}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 bg-black/40 flex items-center gap-2">
                <div className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: accent }} />
                <span className="text-zinc-700 text-[10px] font-black uppercase tracking-widest">
                  Top 2 advance
                </span>
              </div>
            </div>
          );
        })}
    </div>
  );
}

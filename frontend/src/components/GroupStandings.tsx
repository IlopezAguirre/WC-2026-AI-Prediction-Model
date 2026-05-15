import type { Standings } from '../types';
import { flag } from '../utils/flags';

interface Props {
  standings: Standings;
}

export function GroupStandings({ standings }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Object.entries(standings)
        .sort()
        .map(([group, teams]) => (
          <div
            key={group}
            className="bg-slate-800 rounded-xl border border-slate-700/60 overflow-hidden"
          >
            {/* Card header */}
            <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between bg-slate-800/80">
              <span className="text-white font-bold tracking-wide text-sm">
                Group {group}
              </span>
              <div className="flex gap-1.5">
                {teams.map((t) => (
                  <span key={t.team} title={t.team} className="text-base leading-none">
                    {flag(t.team)}
                  </span>
                ))}
              </div>
            </div>

            {/* Standings rows */}
            <div className="divide-y divide-slate-700/40">
              {teams.map((t, i) => (
                <div
                  key={t.team}
                  className={`flex items-center px-4 py-2.5 gap-3 transition-colors ${
                    i < 2 ? 'hover:bg-slate-700/40' : 'opacity-70 hover:bg-slate-700/20'
                  }`}
                >
                  {/* Position badge */}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0
                        ? 'bg-yellow-500 text-slate-900'
                        : i === 1
                        ? 'bg-slate-400 text-slate-900'
                        : 'bg-slate-700 text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </div>

                  {/* Flag + name */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-base leading-none shrink-0">{flag(t.team)}</span>
                    <span
                      className={`text-sm truncate ${
                        i < 2 ? 'text-white font-medium' : 'text-slate-400'
                      }`}
                    >
                      {t.team}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <span
                      className={`font-bold tabular-nums ${
                        i < 2 ? 'text-emerald-400' : 'text-slate-600'
                      }`}
                    >
                      {t.points}pt
                    </span>
                    <span className="text-slate-600 tabular-nums w-8 text-right">
                      {t.gd > 0 ? `+${t.gd}` : t.gd}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Qualifier bar */}
            <div className="px-4 py-2 bg-slate-900/40 border-t border-slate-700/40">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70 shrink-0" />
                Top 2 advance to Round of 32
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

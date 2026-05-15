import type { Standings } from '../types';

interface Props {
  standings: Standings;
}

export function GroupStandings({ standings }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Object.entries(standings)
        .sort()
        .map(([group, teams]) => (
          <div key={group} className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
              Group {group}
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs">
                  <th className="text-left pb-1">Team</th>
                  <th className="text-right pb-1">Pts</th>
                  <th className="text-right pb-1">GF</th>
                  <th className="text-right pb-1">GA</th>
                  <th className="text-right pb-1">GD</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t, i) => (
                  <tr
                    key={t.team}
                    className={`border-t border-slate-700 ${i < 2 ? 'text-white' : 'text-slate-400'}`}
                  >
                    <td className="py-1">
                      {i < 2 && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 mb-0.5" />
                      )}
                      {t.team}
                    </td>
                    <td className="text-right font-semibold">{t.points}</td>
                    <td className="text-right">{t.gf}</td>
                    <td className="text-right">{t.ga}</td>
                    <td className="text-right">{t.gd > 0 ? `+${t.gd}` : t.gd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}

import { useState } from 'react';
import { OFFICIAL_TEAMS } from '../api/client';

interface Props {
  onSimulate: (groups: Record<string, string[]>) => void;
}

const GROUP_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

const INITIAL_GROUPS: Record<string, string[]> = Object.fromEntries(
  GROUP_LETTERS.map((l) => [l, []]),
);

export function CustomDrawEditor({ onSimulate }: Props) {
  const [groups, setGroups] = useState<Record<string, string[]>>(INITIAL_GROUPS);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const assigned = new Set(Object.values(groups).flat());
  const pool = OFFICIAL_TEAMS.filter((t) => !assigned.has(t)).sort();
  const isValid = Object.values(groups).every((g) => g.length === 4);
  const assignedCount = assigned.size;

  function handlePoolClick(team: string) {
    setSelected((prev) => (prev === team ? null : team));
  }

  function handleGroupClick(letter: string) {
    if (!selected) return;
    if (groups[letter].length >= 4) return;
    setGroups((prev) => ({ ...prev, [letter]: [...prev[letter], selected] }));
    setSelected(null);
  }

  function handleRemove(letter: string, team: string) {
    setGroups((prev) => ({
      ...prev,
      [letter]: prev[letter].filter((t) => t !== team),
    }));
  }

  async function handleSimulate() {
    if (!isValid) return;
    setLoading(true);
    try {
      await onSimulate(groups);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + simulate button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Custom Group Draw</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            {assignedCount}/48 teams placed
            {!isValid && assignedCount > 0 && (
              <span className="ml-2 text-yellow-400">
                — fill all groups to 4 teams each
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleSimulate}
          disabled={!isValid || loading}
          className={`px-5 py-2 rounded font-medium text-sm transition-colors ${
            isValid && !loading
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              Simulating…
            </span>
          ) : (
            'Simulate'
          )}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Team pool */}
        <div className="w-48 shrink-0">
          <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Available ({pool.length})
          </h3>
          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
            {pool.map((team) => (
              <button
                key={team}
                onClick={() => handlePoolClick(team)}
                className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                  selected === team
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {team}
              </button>
            ))}
            {pool.length === 0 && (
              <p className="text-slate-600 text-xs italic">All teams placed</p>
            )}
          </div>
        </div>

        {/* Group grid */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {GROUP_LETTERS.map((letter) => {
            const teams = groups[letter];
            const full = teams.length === 4;
            return (
              <div
                key={letter}
                onClick={() => handleGroupClick(letter)}
                className={`rounded-lg p-3 border transition-colors ${
                  full
                    ? 'bg-slate-800 border-emerald-800'
                    : selected
                    ? 'bg-slate-800 border-slate-600 cursor-pointer hover:border-emerald-500'
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    Group {letter}
                  </span>
                  <span
                    className={`text-xs font-medium ${full ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {teams.length}/4
                  </span>
                </div>

                <div className="space-y-1">
                  {teams.map((team) => (
                    <div
                      key={team}
                      className="flex items-center justify-between bg-slate-700 rounded px-2 py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-white text-xs truncate">{team}</span>
                      <button
                        onClick={() => handleRemove(letter, team)}
                        className="ml-1 text-slate-500 hover:text-red-400 transition-colors text-xs leading-none"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {Array.from({ length: 4 - teams.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className={`h-6 rounded border border-dashed ${
                        selected ? 'border-emerald-700 bg-emerald-900/10' : 'border-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { OFFICIAL_TEAMS } from '../api/client';
import { FlagIcon } from '../utils/flags';

interface Props {
  onSimulate: (groups: Record<string, string[]>) => void;
}

const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

const GROUP_COLORS: Record<string, string> = {
  A: '#CCFF00', B: '#00D4FF', C: '#E8002D', D: '#FF6B00',
  E: '#7B2FBE', F: '#CCFF00', G: '#00D4FF', H: '#E8002D',
  I: '#FF6B00', J: '#7B2FBE', K: '#CCFF00', L: '#00D4FF',
};

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
    if (!selected || groups[letter].length >= 4) return;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-black text-xl uppercase tracking-tight">
            Custom Group Draw
          </h2>
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mt-1">
            {assignedCount}/48 placed
            {!isValid && assignedCount > 0 && (
              <span style={{ color: '#CCFF00' }}> — fill all groups to 4</span>
            )}
          </p>
        </div>
        <button
          onClick={handleSimulate}
          disabled={!isValid || loading}
          className={`px-5 py-2 font-black text-xs uppercase tracking-widest transition-opacity ${
            isValid && !loading
              ? 'text-black hover:opacity-90 cursor-pointer'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          }`}
          style={isValid && !loading ? { backgroundColor: '#CCFF00' } : {}}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span
                className="w-3 h-3 border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#CCFF00', borderTopColor: 'transparent' }}
              />
              Simulating…
            </span>
          ) : (
            'Simulate'
          )}
        </button>
      </div>

      <div className="flex gap-5">
        {/* Pool */}
        <div className="w-44 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2" style={{ backgroundColor: '#CCFF00' }} />
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
              Pool ({pool.length})
            </span>
          </div>
          <div className="space-y-0.5 max-h-[580px] overflow-y-auto pr-1">
            {pool.map((team) => (
              <button
                key={team}
                onClick={() => handlePoolClick(team)}
                className={`w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                  selected === team
                    ? 'text-black'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
                style={selected === team ? { backgroundColor: '#CCFF00' } : {}}
              >
                <span className="flex items-center gap-1.5">
                  <FlagIcon team={team} size={14} />
                  {team}
                </span>
              </button>
            ))}
            {pool.length === 0 && (
              <p className="text-zinc-700 text-[10px] font-black uppercase tracking-widest px-3 py-2">
                All placed
              </p>
            )}
          </div>
        </div>

        {/* Group grid */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {GROUP_LETTERS.map((letter) => {
            const teams = groups[letter];
            const full = teams.length === 4;
            const accent = GROUP_COLORS[letter];
            return (
              <div
                key={letter}
                onClick={() => handleGroupClick(letter)}
                className={`bg-zinc-950 border transition-colors overflow-hidden ${
                  full
                    ? 'border-zinc-700'
                    : selected
                    ? 'border-zinc-600 cursor-pointer hover:border-zinc-400'
                    : 'border-zinc-800'
                }`}
              >
                <div className="h-0.5" style={{ backgroundColor: accent }} />
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-black text-[9px] font-black px-1.5 py-0.5 uppercase tracking-wider"
                      style={{ backgroundColor: accent }}
                    >
                      Group {letter}
                    </span>
                    <span className="text-zinc-700 text-[10px] font-black">{teams.length}/4</span>
                  </div>

                  <div className="space-y-1">
                    {teams.map((team) => (
                      <div
                        key={team}
                        className="flex items-center justify-between bg-zinc-900 px-2 py-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="flex items-center gap-1 text-white text-[10px] font-bold truncate">
                          <FlagIcon team={team} size={14} />
                          {team}
                        </span>
                        <button
                          onClick={() => handleRemove(letter, team)}
                          className="ml-1 text-zinc-600 hover:text-white transition-colors text-xs leading-none shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {Array.from({ length: 4 - teams.length }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className={`h-5 border border-dashed ${
                          selected ? 'border-zinc-600' : 'border-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

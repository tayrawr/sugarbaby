import React from 'react';

interface AppetiteSliderProps {
  value: number; // 0 to 100
  onChange: (val: number) => void;
}

export const AppetiteSlider: React.FC<AppetiteSliderProps> = ({ value, onChange }) => {
  const getAppetiteDescription = (percent: number) => {
    if (percent === 0) return { emoji: '❌', text: 'Refused Food (0%)', color: 'text-rose-400' };
    if (percent <= 25) return { emoji: '🥣', text: `Nibbled a bit (${percent}%)`, color: 'text-amber-400' };
    if (percent <= 50) return { emoji: '🥣', text: `Ate about half (${percent}%)`, color: 'text-yellow-400' };
    if (percent <= 75) return { emoji: '😋', text: `Mostly finished (${percent}%)`, color: 'text-emerald-400' };
    if (percent < 100) return { emoji: '😻', text: `Almost all eaten (${percent}%)`, color: 'text-emerald-400' };
    return { emoji: '✨', text: 'Licked the bowl clean! (100%)', color: 'text-emerald-300 font-bold' };
  };

  const { emoji, text, color } = getAppetiteDescription(value);

  const presets = [
    { label: '0%', val: 0 },
    { label: '25%', val: 25 },
    { label: '50%', val: 50 },
    { label: '75%', val: 75 },
    { label: '100%', val: 100 },
  ];

  return (
    <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300">Appetite (How much was eaten?)</label>
        <div className={`text-xs flex items-center gap-1.5 ${color}`}>
          <span>{emoji}</span>
          <span>{text}</span>
        </div>
      </div>

      {/* Interactive Range Input */}
      <div className="relative pt-1">
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      {/* Preset Chips */}
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        {presets.map((p) => {
          const isSelected = value === p.val;
          return (
            <button
              key={p.val}
              type="button"
              onClick={() => onChange(p.val)}
              className={`py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/40 scale-102'
                  : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

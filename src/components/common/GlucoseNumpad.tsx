import React from 'react';
import { Delete } from 'lucide-react';

interface GlucoseNumpadProps {
  value: string;
  onChange: (val: string) => void;
  onNudge?: (delta: number) => void;
  allowDecimal?: boolean;
}

export const GlucoseNumpad: React.FC<GlucoseNumpadProps> = ({
  value,
  onChange,
  onNudge,
  allowDecimal = false,
}) => {
  const handleDigit = (digit: string) => {
    if (value === '0' && digit !== '.') {
      onChange(digit);
      return;
    }
    if (digit === '.' && value.includes('.')) {
      return;
    }
    if (value.length >= 5) return; // Prevent excessive input
    onChange(value + digit);
  };

  const handleBackspace = () => {
    if (value.length <= 1) {
      onChange('');
    } else {
      onChange(value.slice(0, -1));
    }
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="space-y-2 select-none">
      {/* Quick Stepper Nudges */}
      {onNudge && (
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          <button
            type="button"
            onClick={() => onNudge(-10)}
            className="py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 border border-slate-700 text-xs font-semibold text-slate-300 transition-transform"
          >
            -10
          </button>
          <button
            type="button"
            onClick={() => onNudge(-5)}
            className="py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 border border-slate-700 text-xs font-semibold text-slate-300 transition-transform"
          >
            -5
          </button>
          <button
            type="button"
            onClick={() => onNudge(5)}
            className="py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 border border-slate-700 text-xs font-semibold text-slate-300 transition-transform"
          >
            +5
          </button>
          <button
            type="button"
            onClick={() => onNudge(10)}
            className="py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 border border-slate-700 text-xs font-semibold text-slate-300 transition-transform"
          >
            +10
          </button>
        </div>
      )}

      {/* Main 3x4 Numpad */}
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            className="h-13 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:bg-slate-600 active:scale-95 border border-slate-700/70 text-xl font-bold text-slate-100 shadow-sm transition-all flex items-center justify-center"
          >
            {digit}
          </button>
        ))}

        {/* Bottom Row: Clear / Decimal, 0, Backspace */}
        {allowDecimal ? (
          <button
            type="button"
            onClick={() => handleDigit('.')}
            className="h-13 rounded-2xl bg-slate-800/70 hover:bg-slate-700 active:scale-95 border border-slate-700 text-xl font-bold text-slate-300 transition-all flex items-center justify-center"
          >
            .
          </button>
        ) : (
          <button
            type="button"
            onClick={handleClear}
            className="h-13 rounded-2xl bg-slate-800/70 hover:bg-rose-900/30 active:scale-95 border border-slate-700 text-xs font-bold text-slate-400 hover:text-rose-300 transition-all flex items-center justify-center uppercase tracking-wider"
          >
            Clear
          </button>
        )}

        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-13 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:bg-slate-600 active:scale-95 border border-slate-700/70 text-xl font-bold text-slate-100 shadow-sm transition-all flex items-center justify-center"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleBackspace}
          className="h-13 rounded-2xl bg-slate-800/70 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-300 hover:text-rose-400 transition-all flex items-center justify-center"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

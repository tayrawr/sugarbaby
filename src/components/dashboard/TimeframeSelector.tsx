import React from 'react';
import type { TimeWindow } from '../../types';

interface TimeframeSelectorProps {
  value: TimeWindow;
  onChange: (val: TimeWindow) => void;
}

const TIMEFRAMES: { label: string; value: TimeWindow }[] = [
  { label: 'Today', value: 'TODAY' },
  { label: '1 Week', value: '7D' },
  { label: '2 Weeks', value: '14D' },
  { label: '1 Month', value: '1M' },
  { label: '3 Months', value: '3M' },
  { label: 'All', value: 'ALL' },
];

export const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-2xl overflow-x-auto scrollbar-none">
      {TIMEFRAMES.map((tf) => {
        const isSelected = value === tf.value;
        return (
          <button
            key={tf.value}
            type="button"
            onClick={() => onChange(tf.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              isSelected
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tf.label}
          </button>
        );
      })}
    </div>
  );
};

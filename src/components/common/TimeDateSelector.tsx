import React, { useState } from 'react';
import { format, subMinutes, isToday, isYesterday, parseISO } from 'date-fns';
import { Clock, Calendar, ChevronDown } from 'lucide-react';

interface TimeDateSelectorProps {
  value: string; // ISO string
  onChange: (newIso: string) => void;
}

export const TimeDateSelector: React.FC<TimeDateSelectorProps> = ({ value, onChange }) => {
  const currentDate = parseISO(value);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const applyOffset = (minutes: number) => {
    if (minutes === 0) {
      onChange(new Date().toISOString());
    } else {
      const updated = subMinutes(new Date(), minutes);
      onChange(updated.toISOString());
    }
  };

  const setDateShortcut = (type: 'today' | 'yesterday') => {
    const d = new Date();
    if (type === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    // Preserve current hours & minutes
    d.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);
    onChange(d.toISOString());
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [year, month, day] = e.target.value.split('-').map(Number);
    const d = new Date(currentDate);
    d.setFullYear(year, month - 1, day);
    onChange(d.toISOString());
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [hours, minutes] = e.target.value.split(':').map(Number);
    const d = new Date(currentDate);
    d.setHours(hours, minutes, 0, 0);
    onChange(d.toISOString());
  };

  const isCurrentToday = isToday(currentDate);
  const isCurrentYesterday = isYesterday(currentDate);

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 space-y-3">
      {/* Top Bar: Date selection & current readable time */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setDateShortcut('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              isCurrentToday
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-slate-700/70 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDateShortcut('yesterday')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              isCurrentYesterday
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-slate-700/70 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Yesterday
          </button>
        </div>

        {/* Clickable time display that expands manual inputs */}
        <button
          type="button"
          onClick={() => setShowCustomPicker(!showCustomPicker)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-slate-600 text-slate-100 text-xs font-medium transition-colors ml-auto"
        >
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>{format(currentDate, 'hh:mm a')}</span>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showCustomPicker ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Quick Time Offsets */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <button
          type="button"
          onClick={() => applyOffset(0)}
          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-medium transition-all shrink-0 flex items-center gap-1"
        >
          <span>⏱️</span> Now
        </button>
        <button
          type="button"
          onClick={() => applyOffset(15)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all shrink-0"
        >
          -15m
        </button>
        <button
          type="button"
          onClick={() => applyOffset(30)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all shrink-0"
        >
          -30m
        </button>
        <button
          type="button"
          onClick={() => applyOffset(60)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all shrink-0"
        >
          -1h
        </button>
        <button
          type="button"
          onClick={() => applyOffset(120)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all shrink-0"
        >
          -2h
        </button>
      </div>

      {/* Collapsible Exact Date & Time Picker */}
      {showCustomPicker && (
        <div className="pt-2 border-t border-slate-700/60 grid grid-cols-2 gap-2 animate-fadeIn">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> Date
            </label>
            <input
              type="date"
              value={format(currentDate, 'yyyy-MM-dd')}
              onChange={handleDateChange}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" /> Time
            </label>
            <input
              type="time"
              value={format(currentDate, 'HH:mm')}
              onChange={handleTimeChange}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

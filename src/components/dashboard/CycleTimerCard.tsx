import React, { useState, useEffect } from 'react';
import { Clock, Syringe, AlertCircle, CheckCircle2 } from 'lucide-react';
import { parseISO, differenceInMinutes, format } from 'date-fns';
import type { Dose, Pet } from '../../types';

interface CycleTimerCardProps {
  pet: Pet;
  lastDose?: Dose | null;
}

export const CycleTimerCard: React.FC<CycleTimerCardProps> = ({ pet, lastDose }) => {
  const [now, setNow] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (!lastDose) {
    return (
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <Syringe className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">Insulin Therapy Cycle</div>
            <div className="text-sm font-bold text-white mt-0.5">No doses recorded yet</div>
            <div className="text-[11px] text-slate-500">Scheduled: {pet.scheduledAmTime} & {pet.scheduledPmTime}</div>
          </div>
        </div>
      </div>
    );
  }

  const lastDoseDate = parseISO(lastDose.timestamp);
  const minutesSinceLast = differenceInMinutes(now, lastDoseDate);
  const hoursSince = Math.floor(minutesSinceLast / 60);
  const minsSince = minutesSinceLast % 60;

  // 12-hour cycle is 720 minutes
  const cycleTotalMinutes = 720;
  const minutesUntilNext = Math.max(0, cycleTotalMinutes - minutesSinceLast);
  const hoursUntil = Math.floor(minutesUntilNext / 60);
  const minsUntil = minutesUntilNext % 60;

  const cycleProgressPercent = Math.min(100, Math.round((minutesSinceLast / cycleTotalMinutes) * 100));
  const isDueNow = minutesSinceLast >= 720;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        {/* Left: Last dose info */}
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-2xl border transition-all ${
            isDueNow
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse'
              : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
          }`}>
            <Syringe className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Current 12-Hour Cycle
              </span>
              {isDueNow ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <AlertCircle className="w-3 h-3" /> Next Dose Due!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Active Cycle
                </span>
              )}
            </div>

            <div className="text-sm font-bold text-white mt-1">
              Last Dose: <span className="text-indigo-300">{lastDose.units} U</span> at {format(lastDoseDate, 'hh:mm a')}
              <span className="text-xs text-slate-400 font-normal ml-2">
                ({hoursSince}h {minsSince}m ago)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Countdown to next scheduled dose */}
        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800/80">
          <div className="text-left sm:text-right">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center sm:justify-end gap-1">
              <Clock className="w-3 h-3 text-indigo-400" />
              <span>{isDueNow ? 'Dose Window Open' : 'Next Dose Window in:'}</span>
            </div>
            <div className={`text-base sm:text-lg font-black tracking-tight mt-0.5 ${
              isDueNow ? 'text-amber-400' : 'text-slate-100'
            }`}>
              {isDueNow ? 'Ready for Injection' : `${hoursUntil}h ${minsUntil}m`}
            </div>
          </div>

          {/* Mini circular/bar progress indicator */}
          <div className="w-14 h-14 rounded-2xl bg-slate-950/80 border border-slate-800 p-1.5 flex flex-col items-center justify-center text-center shrink-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Progress</span>
            <span className={`text-xs font-black ${isDueNow ? 'text-amber-400' : 'text-indigo-400'}`}>
              {cycleProgressPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Cycle Progress Bar */}
      <div className="w-full h-1.5 bg-slate-950 rounded-full mt-3.5 overflow-hidden border border-slate-800">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isDueNow
              ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
              : 'bg-gradient-to-r from-indigo-500 to-emerald-400 shadow-sm shadow-indigo-500/30'
          }`}
          style={{ width: `${cycleProgressPercent}%` }}
        />
      </div>
    </div>
  );
};

import React from 'react';
import { Activity, Target, TrendingDown, ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { Reading, Pet, BgUnit } from '../../types';
import { formatBgValue, getBgStatus } from '../../utils/units';

interface MetricSummaryCardsProps {
  pet: Pet;
  readings: Reading[];
  bgUnit: BgUnit;
  timeWindowLabel: string;
}

export const MetricSummaryCards: React.FC<MetricSummaryCardsProps> = ({
  pet,
  readings,
  bgUnit,
  timeWindowLabel,
}) => {
  const totalReadings = readings.length;

  // 1. Average BG
  const avgBg = totalReadings > 0
    ? Math.round(readings.reduce((sum, r) => sum + r.valueMgDl, 0) / totalReadings)
    : null;

  const avgStatus = avgBg ? getBgStatus(avgBg, pet) : null;

  // 2. Latest Reading
  const sortedReadings = [...readings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const latestReading = sortedReadings[0] ?? null;
  const latestStatus = latestReading ? getBgStatus(latestReading.valueMgDl, pet) : null;

  // 3. Time In Range Breakdown
  const inTargetCount = readings.filter(
    (r) => r.valueMgDl >= pet.targetMinMgDl && r.valueMgDl <= pet.targetMaxMgDl
  ).length;
  const hypoCount = readings.filter((r) => r.valueMgDl < pet.hypoThresholdMgDl).length;

  const inTargetPct = totalReadings > 0 ? Math.round((inTargetCount / totalReadings) * 100) : 0;
  const hypoPct = totalReadings > 0 ? Math.round((hypoCount / totalReadings) * 100) : 0;
  const elevatedPct = totalReadings > 0 ? Math.max(0, 100 - inTargetPct - hypoPct) : 0;

  // 4. Lowest Nadir
  const allValues = readings.map((r) => r.valueMgDl);
  const nadirVal = allValues.length > 0 ? Math.min(...allValues) : null;
  const nadirStatus = nadirVal ? getBgStatus(nadirVal, pet) : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Card 1: Average BG */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {timeWindowLabel} Average
          </span>
          <div className="p-2 rounded-xl bg-slate-800 text-slate-400 group-hover:text-indigo-400 transition-colors">
            <Activity className="w-4 h-4" />
          </div>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {avgBg ? formatBgValue(avgBg, bgUnit) : '—'}
            </span>
            <span className="text-xs font-bold text-slate-400">{bgUnit}</span>
          </div>
        </div>

        <div>
          {avgStatus ? (
            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border ${avgStatus.badgeClass}`}>
              ● {avgStatus.label}
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">No readings yet</span>
          )}
        </div>
      </div>

      {/* Card 2: Latest Reading */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Latest Reading
          </span>
          <div className="p-2 rounded-xl bg-slate-800 text-slate-400 group-hover:text-rose-400 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl sm:text-3xl font-black tracking-tight ${latestStatus ? latestStatus.textColorClass : 'text-white'}`}>
              {latestReading ? formatBgValue(latestReading.valueMgDl, bgUnit) : '—'}
            </span>
            <span className="text-xs font-bold text-slate-400">{bgUnit}</span>
          </div>
        </div>

        <div>
          {latestReading ? (
            <span className="text-[11px] text-slate-400">
              {formatDistanceToNow(parseISO(latestReading.timestamp), { addSuffix: true })}
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">Awaiting test</span>
          )}
        </div>
      </div>

      {/* Card 3: Time in Target Range (TIR) */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Time In Target
          </span>
          <div className="p-2 rounded-xl bg-slate-800 text-slate-400 group-hover:text-emerald-400 transition-colors">
            <Target className="w-4 h-4" />
          </div>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
              {totalReadings > 0 ? `${inTargetPct}%` : '—'}
            </span>
            <span className="text-xs text-slate-400 font-medium">({pet.targetMinMgDl}–{pet.targetMaxMgDl})</span>
          </div>
        </div>

        {/* 3-Color TIR breakdown bar */}
        <div className="space-y-1.5">
          <div className="w-full h-2 bg-slate-950 rounded-full flex overflow-hidden border border-slate-800">
            {inTargetPct > 0 && (
              <div
                style={{ width: `${inTargetPct}%` }}
                className="bg-emerald-500 h-full"
                title={`Target: ${inTargetPct}%`}
              />
            )}
            {elevatedPct > 0 && (
              <div
                style={{ width: `${elevatedPct}%` }}
                className="bg-amber-500 h-full"
                title={`Elevated: ${elevatedPct}%`}
              />
            )}
            {hypoPct > 0 && (
              <div
                style={{ width: `${hypoPct}%` }}
                className="bg-rose-500 h-full"
                title={`Hypo: ${hypoPct}%`}
              />
            )}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span className="text-emerald-400">🟢 {inTargetPct}%</span>
            <span className="text-amber-400">🟡 {elevatedPct}%</span>
            <span className="text-rose-400">🔴 {hypoPct}%</span>
          </div>
        </div>
      </div>

      {/* Card 4: Lowest Nadir Point */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Lowest Nadir Point
          </span>
          <div className="p-2 rounded-xl bg-slate-800 text-slate-400 group-hover:text-teal-400 transition-colors">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-teal-300 tracking-tight">
              {nadirVal ? formatBgValue(nadirVal, bgUnit) : '—'}
            </span>
            <span className="text-xs font-bold text-slate-400">{bgUnit}</span>
          </div>
        </div>

        <div>
          {nadirStatus ? (
            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border ${nadirStatus.badgeClass}`}>
              ● Peak insulin action
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">Calculates automatically</span>
          )}
        </div>
      </div>
    </div>
  );
};

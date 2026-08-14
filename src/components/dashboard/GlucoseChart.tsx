import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { LineChart as LineChartIcon, GitMerge, Info } from 'lucide-react';
import type { Reading, Dose, Feeding, HealthNote, Pet, BgUnit, ChartViewMode } from '../../types';
import { formatBgValue, getBgStatus, mgDlToMmolL } from '../../utils/units';

interface GlucoseChartProps {
  pet: Pet;
  readings: Reading[];
  doses: Dose[];
  feedings: Feeding[];
  notes: HealthNote[];
  bgUnit: BgUnit;
}

export const GlucoseChart: React.FC<GlucoseChartProps> = ({
  pet,
  readings,
  doses,
  feedings,
  notes,
  bgUnit,
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('timeline');

  // Sort readings chronologically ascending for chart plotting
  const sortedReadings = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Target boundaries in current unit
  const targetMin = bgUnit === 'mmol/L' ? mgDlToMmolL(pet.targetMinMgDl) : pet.targetMinMgDl;
  const targetMax = bgUnit === 'mmol/L' ? mgDlToMmolL(pet.targetMaxMgDl) : pet.targetMaxMgDl;
  const hypoThreshold = bgUnit === 'mmol/L' ? mgDlToMmolL(pet.hypoThresholdMgDl) : pet.hypoThresholdMgDl;
  const highThreshold = bgUnit === 'mmol/L' ? mgDlToMmolL(pet.highThresholdMgDl) : pet.highThresholdMgDl;

  // Prepare Continuous Timeline Data
  const timelineData = sortedReadings.map((r) => {
    const d = parseISO(r.timestamp);
    const displayVal = bgUnit === 'mmol/L' ? mgDlToMmolL(r.valueMgDl) : r.valueMgDl;

    // Find nearby events within 20 minutes
    const nearbyDose = doses.find(
      (dose) => Math.abs(differenceInMinutes(d, parseISO(dose.timestamp))) <= 20
    );
    const nearbyFeeding = feedings.find(
      (feed) => Math.abs(differenceInMinutes(d, parseISO(feed.timestamp))) <= 20
    );
    const nearbyNote = notes.find(
      (note) => Math.abs(differenceInMinutes(d, parseISO(note.timestamp))) <= 20
    );

    return {
      timestamp: r.timestamp,
      formattedTime: format(d, 'MMM d, h:mm a'),
      shortTime: format(d, 'MM/dd HH:mm'),
      value: displayVal,
      rawMgDl: r.valueMgDl,
      cycleTag: r.cycleTag,
      note: r.note,
      hasDose: Boolean(nearbyDose),
      doseInfo: nearbyDose ? `${nearbyDose.units} U` : undefined,
      hasFeeding: Boolean(nearbyFeeding),
      feedingInfo: nearbyFeeding ? `${nearbyFeeding.foodName} (${nearbyFeeding.amount})` : undefined,
      hasNote: Boolean(nearbyNote),
      noteInfo: nearbyNote ? nearbyNote.content || nearbyNote.tags.join(', ') : undefined,
    };
  });

  // Prepare Overlaid 12-Hour Curve Data (Grouped by Cycle hours 0 to 12)
  const spiderDataMap = new Map<number, { hour: number; values: number[] }>();
  for (let h = 0; h <= 12; h += 0.5) {
    spiderDataMap.set(h, { hour: h, values: [] });
  }

  // Calculate cycle offset for each reading
  for (const r of readings) {
    const rDate = parseISO(r.timestamp);
    // Find closest preceding dose within 14 hours
    const precedingDose = [...doses]
      .filter((d) => {
        const dDate = parseISO(d.timestamp);
        const diff = differenceInMinutes(rDate, dDate);
        return diff >= -30 && diff <= 720;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (precedingDose) {
      const diffMins = Math.max(0, differenceInMinutes(rDate, parseISO(precedingDose.timestamp)));
      const offsetHours = Math.min(12, Math.round((diffMins / 60) * 2) / 2); // round to nearest 0.5h
      const entry = spiderDataMap.get(offsetHours);
      if (entry) {
        entry.values.push(bgUnit === 'mmol/L' ? mgDlToMmolL(r.valueMgDl) : r.valueMgDl);
      }
    }
  }

  const spiderChartData = Array.from(spiderDataMap.values()).map((item) => {
    const avg = item.values.length > 0
      ? Number((item.values.reduce((s, v) => s + v, 0) / item.values.length).toFixed(1))
      : null;
    return {
      hourLabel: `+${item.hour}h`,
      hour: item.hour,
      averageBg: avg,
      sampleCount: item.values.length,
    };
  });

  // Custom Chart Dot
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || !payload) return null;

    const status = getBgStatus(payload.rawMgDl, pet);
    const hasEvent = payload.hasDose || payload.hasFeeding || payload.hasNote;

    return (
      <g key={`dot-${payload.timestamp}`}>
        {/* Event indicator halo */}
        {hasEvent && (
          <circle
            cx={cx}
            cy={cy}
            r={9}
            fill="none"
            stroke="#a855f7"
            strokeWidth={2}
            strokeDasharray="2 2"
          />
        )}
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill={status.colorHex}
          stroke="#0f172a"
          strokeWidth={2}
        />
      </g>
    );
  };

  // Custom Tooltip
  const CustomTimelineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const status = getBgStatus(data.rawMgDl, pet);

      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-2xl shadow-2xl space-y-1.5 z-50 text-xs min-w-44">
          <div className="text-slate-400 font-semibold">{data.formattedTime}</div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-white">
              {formatBgValue(data.rawMgDl, bgUnit)} {bgUnit}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${status.badgeClass}`}>
              {status.label}
            </span>
          </div>

          {data.cycleTag && (
            <div className="text-[11px] text-indigo-300 font-semibold">
              Cycle: {data.cycleTag}
            </div>
          )}

          {data.hasDose && (
            <div className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
              <span>💉</span> Dose: {data.doseInfo}
            </div>
          )}
          {data.hasFeeding && (
            <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
              <span>🥣</span> Feeding: {data.feedingInfo}
            </div>
          )}
          {data.hasNote && (
            <div className="text-[11px] text-teal-400 font-medium flex items-center gap-1">
              <span>📝</span> Note: {data.noteInfo}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Chart Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span>Blood Glucose Curve</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Target: {formatBgValue(pet.targetMinMgDl, bgUnit)}–{formatBgValue(pet.targetMaxMgDl, bgUnit)} {bgUnit}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {viewMode === 'timeline'
              ? 'Continuous chronological curve with target zone'
              : 'Overlaid 12-hour cycle response curve (Nadir Dip)'}
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'timeline'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LineChartIcon className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('overlaid12h')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'overlaid12h'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>12h Overlaid Curve</span>
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      {timelineData.length === 0 ? (
        <div className="h-64 sm:h-72 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
          <Info className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-300">No glucose readings in this window</p>
          <p className="text-xs text-slate-500 mt-1">
            Tap "+ Reading" below to start logging blood glucose!
          </p>
        </div>
      ) : (
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'timeline' ? (
              <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />

                {/* Shaded Green Target Zone */}
                <ReferenceArea
                  y1={targetMin}
                  y2={targetMax}
                  fill="#10b981"
                  fillOpacity={0.12}
                />

                {/* Dotted threshold guidelines */}
                <ReferenceLine
                  y={hypoThreshold}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />
                <ReferenceLine
                  y={highThreshold}
                  stroke="#f97316"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />

                <XAxis
                  dataKey="shortTime"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  domain={[
                    (dataMin: number) => Math.max(0, Math.floor(Math.min(dataMin, targetMin) * 0.8)),
                    (dataMax: number) => Math.ceil(Math.max(dataMax, targetMax) * 1.15),
                  ]}
                />
                <Tooltip content={<CustomTimelineTooltip />} />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  dot={renderCustomDot}
                  activeDot={{ r: 7, fill: '#818cf8', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            ) : (
              /* Overlaid 12-Hour Cycle Curve */
              <LineChart data={spiderChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />

                <ReferenceArea
                  y1={targetMin}
                  y2={targetMax}
                  fill="#10b981"
                  fillOpacity={0.12}
                />

                <XAxis
                  dataKey="hourLabel"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  domain={[
                    (dataMin: number) => Math.max(0, Math.floor(Math.min(dataMin, targetMin) * 0.8)),
                    (dataMax: number) => Math.ceil(Math.max(dataMax, targetMax) * 1.15),
                  ]}
                />
                <Tooltip
                  formatter={(value: any) => [`${value} ${bgUnit}`, 'Average Cycle BG']}
                  labelFormatter={(label) => `Cycle Offset: ${label}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '1rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="averageBg"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  connectNulls
                  dot={{ r: 4, fill: '#38bdf8' }}
                  activeDot={{ r: 6, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart Legend / Guide */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> In Target
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Elevated
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Hypo Alert
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          <span>🟣 Dashed dot = Dose / Feeding / Note nearby</span>
        </div>
      </div>
    </div>
  );
};

import React, { useRef } from 'react';
import { Printer, X, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { Pet, Reading, Dose, Feeding, HealthNote, BgUnit } from '../../types';
import { formatBgValue, getBgStatus } from '../../utils/units';
import { groupEventsIntoCycles, normalizeEvents } from '../../utils/cycles';

interface VetReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  readings: Reading[];
  doses: Dose[];
  feedings: Feeding[];
  notes: HealthNote[];
  bgUnit: BgUnit;
}

export const VetReportModal: React.FC<VetReportModalProps> = ({
  isOpen,
  onClose,
  pet,
  readings,
  doses,
  feedings,
  notes,
  bgUnit,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const allEvents = normalizeEvents(readings, doses, feedings, notes);
  const cycleGroups = groupEventsIntoCycles(allEvents, pet.scheduledAmTime, pet.scheduledPmTime);

  // Compute overall stats
  const totalReadings = readings.length;
  const avgBg = totalReadings > 0
    ? Math.round(readings.reduce((sum, r) => sum + r.valueMgDl, 0) / totalReadings)
    : 0;

  const inTargetCount = readings.filter(
    (r) => r.valueMgDl >= pet.targetMinMgDl && r.valueMgDl <= pet.targetMaxMgDl
  ).length;
  const inTargetPercent = totalReadings > 0 ? Math.round((inTargetCount / totalReadings) * 100) : 0;

  const hypoCount = readings.filter((r) => r.valueMgDl < pet.hypoThresholdMgDl).length;

  const allValues = readings.map((r) => r.valueMgDl);
  const minVal = allValues.length > 0 ? Math.min(...allValues) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Container */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden z-10 animate-scaleUp">
        {/* Header Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Veterinary Glycemic Report</h3>
              <p className="text-xs text-slate-400">Clinical summary for {pet.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div ref={printRef} className="p-6 overflow-y-auto space-y-6 bg-slate-900 text-slate-100">
          {/* Pet Header Card */}
          <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-800/60 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>{pet.avatarEmoji}</span>
                <span>{pet.name}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  Feline Diabetes Log
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Insulin Therapy: <strong className="text-slate-200">{pet.insulinName}</strong> (Default {pet.defaultDoseUnits} U)
              </p>
            </div>

            <div className="text-right text-xs space-y-1">
              <div>
                <span className="text-slate-400">Target BG Range: </span>
                <strong className="text-emerald-400">
                  {formatBgValue(pet.targetMinMgDl, bgUnit)} – {formatBgValue(pet.targetMaxMgDl, bgUnit)} {bgUnit}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Report Date: </span>
                <strong className="text-slate-200">{format(new Date(), 'MMM d, yyyy')}</strong>
              </div>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Average BG</div>
              <div className="text-xl font-bold text-white mt-1">
                {avgBg > 0 ? formatBgValue(avgBg, bgUnit) : '—'} <span className="text-xs text-slate-400">{bgUnit}</span>
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Time In Target</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {inTargetPercent}%
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Lowest Nadir</div>
              <div className="text-xl font-bold text-teal-300 mt-1">
                {minVal > 0 ? formatBgValue(minVal, bgUnit) : '—'} <span className="text-xs text-slate-400">{bgUnit}</span>
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Hypo Events (&lt;{pet.hypoThresholdMgDl})</div>
              <div className={`text-xl font-bold mt-1 ${hypoCount > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                {hypoCount}
              </div>
            </div>
          </div>

          {/* 12-Hour Cycles Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              12-Hour Cycle History ({cycleGroups.length} Cycles)
            </h4>

            <div className="overflow-x-auto border border-slate-700/80 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/90 text-slate-300 border-b border-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Date & Cycle</th>
                    <th className="py-2.5 px-3">Insulin Dose</th>
                    <th className="py-2.5 px-3">Pre-Shot BG</th>
                    <th className="py-2.5 px-3">Nadir (Lowest)</th>
                    <th className="py-2.5 px-3">Feedings & Appetite</th>
                    <th className="py-2.5 px-3">Health Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {cycleGroups.map((group) => {
                    const preShotReading = group.events.find(
                      (e): e is Extract<typeof e, { type: 'reading' }> =>
                        e.type === 'reading' && (e.data.cycleTag === 'AMPS' || e.data.cycleTag === 'PMPS')
                    )?.data;

                    const feedingsList = group.events.filter(
                      (e): e is Extract<typeof e, { type: 'feeding' }> => e.type === 'feeding'
                    );

                    const notesList = group.events.filter(
                      (e): e is Extract<typeof e, { type: 'note' }> => e.type === 'note'
                    );

                    return (
                      <tr key={group.cycleKey} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-white">{group.dateFormatted}</div>
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5 ${
                              group.cycleDesignation === 'AM'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-indigo-500/20 text-indigo-300'
                            }`}
                          >
                            {group.cycleDesignation} Cycle
                          </span>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {group.anchorDose ? (
                            <div>
                              <span className="font-bold text-indigo-300">{group.anchorDose.units} U</span>
                              {group.anchorDose.injectionSite && (
                                <span className="text-[10px] text-slate-400 block">
                                  {group.anchorDose.injectionSite}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">No dose logged</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {preShotReading ? (
                            <span className={`font-bold ${getBgStatus(preShotReading.valueMgDl, pet).textColorClass}`}>
                              {formatBgValue(preShotReading.valueMgDl, bgUnit)} {bgUnit}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {group.nadirReading ? (
                            <span className="font-bold text-emerald-400">
                              {formatBgValue(group.nadirReading.valueMgDl, bgUnit)} {bgUnit}
                              {group.nadirReading.cycleTag && (
                                <span className="text-[10px] text-slate-400 block">
                                  ({group.nadirReading.cycleTag})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-[11px]">
                          {feedingsList.length > 0 ? (
                            feedingsList.map((f) => (
                              <div key={f.id} className="text-slate-300">
                                • {f.data.foodName} ({f.data.amount}) —{' '}
                                <strong className="text-amber-400">{f.data.appetitePercent}%</strong>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-[11px]">
                          {notesList.length > 0 ? (
                            notesList.map((n) => (
                              <div key={n.id} className="text-slate-300">
                                • {n.data.content || (n.data.tags || []).join(', ')}
                                {n.data.weightValue && ` (${n.data.weightValue} ${n.data.weightUnit})`}
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

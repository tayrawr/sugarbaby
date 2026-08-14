import React from 'react';
import { format, parseISO } from 'date-fns';
import { Activity, Syringe, Utensils, FileText, Trash2, Edit2 } from 'lucide-react';
import type { TimelineEvent, Pet, BgUnit, Dose } from '../../types';
import { formatBgValue, getBgStatus } from '../../utils/units';
import { calculateCycleOffset } from '../../utils/cycles';

interface TimelineEventCardProps {
  event: TimelineEvent;
  pet: Pet;
  bgUnit: BgUnit;
  anchorDose?: Dose;
  cycleDesignation: 'AM' | 'PM';
  onEdit: (event: TimelineEvent) => void;
  onDelete: (event: TimelineEvent) => void;
}

export const TimelineEventCard: React.FC<TimelineEventCardProps> = ({
  event,
  pet,
  bgUnit,
  anchorDose,
  cycleDesignation,
  onEdit,
  onDelete,
}) => {
  const eventDate = parseISO(event.timestamp);
  const timeFormatted = format(eventDate, 'hh:mm a');
  const cycleOffset = calculateCycleOffset(event.timestamp, anchorDose, cycleDesignation);

  const renderContent = () => {
    switch (event.type) {
      case 'reading': {
        const reading = event.data;
        const status = getBgStatus(reading.valueMgDl, pet);
        return (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-base sm:text-lg font-black ${status.textColorClass}`}>
                {formatBgValue(reading.valueMgDl, bgUnit)} {bgUnit}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${status.badgeClass}`}>
                {status.label}
              </span>
              {(reading.cycleTag || cycleOffset) && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {reading.cycleTag || cycleOffset}
                </span>
              )}
            </div>
            {reading.note && (
              <p className="text-xs text-slate-400 mt-1 italic leading-relaxed">
                "{reading.note}"
              </p>
            )}
          </div>
        );
      }

      case 'dose': {
        const dose = event.data;
        return (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base sm:text-lg font-black text-indigo-300">
                {dose.units} U
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                {dose.insulinName || pet.insulinName}
              </span>
              {dose.injectionSite && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  📍 {dose.injectionSite}
                </span>
              )}
            </div>
            {dose.note && (
              <p className="text-xs text-slate-400 mt-1 italic leading-relaxed">
                "{dose.note}"
              </p>
            )}
          </div>
        );
      }

      case 'feeding': {
        const feeding = event.data;
        return (
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-slate-100">
                {feeding.foodName}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {feeding.amount}
              </span>
            </div>

            {/* Appetite Bar */}
            <div className="flex items-center gap-2 max-w-xs">
              <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  style={{ width: `${feeding.appetitePercent}%` }}
                  className={`h-full rounded-full ${
                    feeding.appetitePercent === 100
                      ? 'bg-emerald-400'
                      : feeding.appetitePercent >= 50
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400 shrink-0">
                {feeding.appetitePercent}% Eaten
              </span>
            </div>

            {feeding.note && (
              <p className="text-xs text-slate-400 italic leading-relaxed">
                "{feeding.note}"
              </p>
            )}
          </div>
        );
      }

      case 'note': {
        const note = event.data;
        return (
          <div className="flex-1 min-w-0 space-y-1">
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30"
                  >
                    #{tag}
                  </span>
                ))}
                {note.weightValue && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ⚖️ {note.weightValue} {note.weightUnit || 'lbs'}
                  </span>
                )}
              </div>
            )}
            {note.content && (
              <p className="text-xs text-slate-200 leading-relaxed">
                {note.content}
              </p>
            )}
          </div>
        );
      }
    }
  };

  const getEventIcon = () => {
    switch (event.type) {
      case 'reading':
        return (
          <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
        );
      case 'dose':
        return (
          <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shrink-0">
            <Syringe className="w-4 h-4" />
          </div>
        );
      case 'feeding':
        return (
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
            <Utensils className="w-4 h-4" />
          </div>
        );
      case 'note':
        return (
          <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 group transition-all">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {getEventIcon()}

        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1 min-w-0">
          <div className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
            {timeFormatted}
          </div>
          {renderContent()}
        </div>
      </div>

      {/* Edit / Delete Action Buttons */}
      <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onEdit(event)}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Edit entry"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(event)}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors"
          title="Delete entry"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

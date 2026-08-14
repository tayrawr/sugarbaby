import React, { useState } from 'react';
import { Sun, Moon, Syringe, TrendingDown, ChevronDown } from 'lucide-react';
import type { CycleGroup, Pet, BgUnit, TimelineEvent } from '../../types';
import { TimelineEventCard } from './TimelineEventCard';
import { formatBgValue } from '../../utils/units';

interface CycleGroupCardProps {
  group: CycleGroup;
  pet: Pet;
  bgUnit: BgUnit;
  onEditEvent: (event: TimelineEvent) => void;
  onDeleteEvent: (event: TimelineEvent) => void;
  onAddEventToCycle?: (cycleGroup: CycleGroup) => void;
}

export const CycleGroupCard: React.FC<CycleGroupCardProps> = ({
  group,
  pet,
  bgUnit,
  onEditEvent,
  onDeleteEvent,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const isAm = group.cycleDesignation === 'AM';

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-3xl overflow-hidden shadow-lg space-y-0">
      {/* Cycle Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 sm:px-5 py-3.5 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-850 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-2xl border ${
              isAm
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
            }`}
          >
            {isAm ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-white">
                {group.dateFormatted}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isAm
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                }`}
              >
                {group.cycleDesignation} Cycle
              </span>
            </div>

            {/* Cycle Sub-summary */}
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
              {group.anchorDose ? (
                <span className="flex items-center gap-1 text-indigo-300 font-semibold">
                  <Syringe className="w-3 h-3" /> {group.anchorDose.units} U Dose
                </span>
              ) : (
                <span className="text-slate-500">No dose recorded</span>
              )}

              {group.nadirReading && (
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <TrendingDown className="w-3 h-3" /> Nadir: {formatBgValue(group.nadirReading.valueMgDl, bgUnit)} {bgUnit}
                </span>
              )}

              {group.avgBgMgDl && (
                <span className="text-slate-400">
                  Avg: {formatBgValue(group.avgBgMgDl, bgUnit)} {bgUnit}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right action / collapse toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            {group.events.length} {group.events.length === 1 ? 'event' : 'events'}
          </span>
          <div
            className={`p-1.5 rounded-xl bg-slate-800 text-slate-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Cycle Events List */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-2.5 bg-slate-950/40">
          {group.events.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500">
              No events recorded in this cycle
            </div>
          ) : (
            group.events.map((event) => (
              <TimelineEventCard
                key={event.id}
                event={event}
                pet={pet}
                bgUnit={bgUnit}
                anchorDose={group.anchorDose}
                cycleDesignation={group.cycleDesignation}
                onEdit={onEditEvent}
                onDelete={onDeleteEvent}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

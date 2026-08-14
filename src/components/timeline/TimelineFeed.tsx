import React, { useState } from 'react';
import { Calendar, Info } from 'lucide-react';
import type { TimelineEvent, Pet, BgUnit } from '../../types';
import { CycleGroupCard } from './CycleGroupCard';
import { groupEventsIntoCycles } from '../../utils/cycles';

interface TimelineFeedProps {
  events: TimelineEvent[];
  pet: Pet;
  bgUnit: BgUnit;
  onEditEvent: (event: TimelineEvent) => void;
  onDeleteEvent: (event: TimelineEvent) => void;
}

type FilterType = 'all' | 'reading' | 'dose' | 'feeding' | 'note';

export const TimelineFeed: React.FC<TimelineFeedProps> = ({
  events,
  pet,
  bgUnit,
  onEditEvent,
  onDeleteEvent,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredEvents = activeFilter === 'all'
    ? events
    : events.filter((e) => e.type === activeFilter);

  const cycleGroups = groupEventsIntoCycles(filteredEvents, pet.scheduledAmTime, pet.scheduledPmTime);

  const filterOptions: { label: string; value: FilterType; emoji: string }[] = [
    { label: 'All Events', value: 'all', emoji: '✨' },
    { label: 'Readings', value: 'reading', emoji: '🩸' },
    { label: 'Doses', value: 'dose', emoji: '💉' },
    { label: 'Feedings', value: 'feeding', emoji: '🥣' },
    { label: 'Notes', value: 'note', emoji: '📝' },
  ];

  return (
    <div className="space-y-4">
      {/* Feed Header & Event Type Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>Timeline & 12-Hour Cycles</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Log history organized into morning and evening cycles
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {filterOptions.map((opt) => {
            const isSelected = activeFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setActiveFilter(opt.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cycle Groups List */}
      {cycleGroups.length === 0 ? (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl p-8 text-center space-y-2">
          <Info className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-300">No events found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeFilter === 'all'
              ? 'Start logging blood glucose, feedings, doses, and notes using the action buttons below.'
              : `No ${activeFilter} events recorded in this period.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cycleGroups.map((group) => (
            <CycleGroupCard
              key={group.cycleKey}
              group={group}
              pet={pet}
              bgUnit={bgUnit}
              onEditEvent={onEditEvent}
              onDeleteEvent={onDeleteEvent}
            />
          ))}
        </div>
      )}
    </div>
  );
};

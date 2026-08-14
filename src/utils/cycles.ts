import { format, parseISO, differenceInMinutes } from 'date-fns';
import type {
  TimelineEvent,
  Reading,
  Dose,
  Feeding,
  HealthNote,
  CycleGroup,
  CycleDesignation,
} from '../types';

/**
 * Normalizes an event into a unified TimelineEvent.
 */
export function normalizeEvents(
  readings: Reading[],
  doses: Dose[],
  feedings: Feeding[],
  notes: HealthNote[]
): TimelineEvent[] {
  const list: TimelineEvent[] = [];

  for (const r of readings) {
    list.push({ id: r.id, type: 'reading', timestamp: r.timestamp, petId: r.petId, data: r });
  }
  for (const d of doses) {
    list.push({ id: d.id, type: 'dose', timestamp: d.timestamp, petId: d.petId, data: d });
  }
  for (const f of feedings) {
    list.push({ id: f.id, type: 'feeding', timestamp: f.timestamp, petId: f.petId, data: f });
  }
  for (const n of notes) {
    list.push({ id: n.id, type: 'note', timestamp: n.timestamp, petId: n.petId, data: n });
  }

  // Sort descending (most recent first) by default
  return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Determines whether a timestamp falls into the AM Cycle (06:00 - 17:59) or PM Cycle (18:00 - 05:59).
 */
export function getCycleDesignation(date: Date): {
  designation: CycleDesignation;
  cycleDate: Date;
  key: string;
} {
  const hours = date.getHours();
  if (hours >= 6 && hours < 18) {
    return {
      designation: 'AM',
      cycleDate: date,
      key: `${format(date, 'yyyy-MM-dd')}-AM`,
    };
  }

  // PM cycle: if between 00:00 and 05:59, it belongs to previous evening's PM cycle
  if (hours < 6) {
    const prevDay = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    return {
      designation: 'PM',
      cycleDate: prevDay,
      key: `${format(prevDay, 'yyyy-MM-dd')}-PM`,
    };
  }

  return {
    designation: 'PM',
    cycleDate: date,
    key: `${format(date, 'yyyy-MM-dd')}-PM`,
  };
}

/**
 * Calculates human-friendly cycle offset (e.g., "+3.5h" or "AMPS") relative to anchor dose.
 */
export function calculateCycleOffset(
  eventTimestamp: string,
  anchorDose?: Dose | null,
  cycleDesignation: CycleDesignation = 'AM'
): string | null {
  if (!anchorDose) {
    return null;
  }

  const eventDate = parseISO(eventTimestamp);
  const doseDate = parseISO(anchorDose.timestamp);
  const diffMins = differenceInMinutes(eventDate, doseDate);

  if (diffMins >= -30 && diffMins <= 15) {
    return cycleDesignation === 'AM' ? 'AMPS' : 'PMPS';
  }

  if (diffMins > 0) {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (mins === 0) {
      return `+${hours}h`;
    }
    return `+${(diffMins / 60).toFixed(1)}h`;
  }

  return null;
}

/**
 * Groups a flat list of timeline events into structured 12-hour AM/PM cycles.
 */
export function groupEventsIntoCycles(
  events: TimelineEvent[],
  scheduledAm = '08:00',
  scheduledPm = '20:00'
): CycleGroup[] {
  const map = new Map<string, { designation: CycleDesignation; cycleDate: Date; events: TimelineEvent[] }>();

  for (const event of events) {
    const date = parseISO(event.timestamp);
    const { key, designation, cycleDate } = getCycleDesignation(date);

    if (!map.has(key)) {
      map.set(key, { designation, cycleDate, events: [] });
    }
    map.get(key)!.events.push(event);
  }

  const groups: CycleGroup[] = [];

  for (const [key, val] of map.entries()) {
    // Sort events within cycle chronologically (or reverse as desired)
    const sortedEvents = [...val.events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Find anchor dose in this cycle
    const anchorDoseEvent = sortedEvents.find((e) => e.type === 'dose');
    const anchorDose = anchorDoseEvent ? (anchorDoseEvent.data as Dose) : undefined;

    // Collect all readings in this cycle
    const readingsInCycle = sortedEvents
      .filter((e): e is Extract<TimelineEvent, { type: 'reading' }> => e.type === 'reading')
      .map((e) => e.data);

    let nadirReading: Reading | undefined;
    let avgBgMgDl: number | undefined;
    let minBgMgDl: number | undefined;
    let maxBgMgDl: number | undefined;

    if (readingsInCycle.length > 0) {
      const values = readingsInCycle.map((r) => r.valueMgDl);
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);
      minBgMgDl = minVal;
      maxBgMgDl = maxVal;
      avgBgMgDl = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
      nadirReading = readingsInCycle.find((r) => r.valueMgDl === minVal);
    }

    groups.push({
      cycleKey: key,
      dateFormatted: format(val.cycleDate, 'EEEE, MMM d, yyyy'),
      cycleDesignation: val.designation,
      scheduledTime: val.designation === 'AM' ? scheduledAm : scheduledPm,
      anchorDose,
      events: sortedEvents,
      nadirReading,
      avgBgMgDl,
      minBgMgDl,
      maxBgMgDl,
    });
  }

  // Sort cycle groups descending by key
  return groups.sort((a, b) => b.cycleKey.localeCompare(a.cycleKey));
}

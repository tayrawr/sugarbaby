import { describe, it, expect } from 'vitest';
import {
  normalizeEvents,
  getCycleDesignation,
  calculateCycleOffset,
  groupEventsIntoCycles,
} from './cycles';
import type { Reading, Dose, Feeding, HealthNote } from '../types';

describe('Cycles & 12-Hour Therapeutic Windows Seam', () => {
  describe('normalizeEvents', () => {
    it('combines readings, doses, feedings, and health notes into a unified chronologically sorted list', () => {
      const readings: Reading[] = [
        {
          id: 'r1',
          petId: 'pet1',
          timestamp: '2026-08-15T08:00:00Z',
          valueMgDl: 120,
        },
      ];
      const doses: Dose[] = [
        {
          id: 'd1',
          petId: 'pet1',
          timestamp: '2026-08-15T08:05:00Z',
          units: 1.5,
          insulinName: 'Lantus',
        },
      ];
      const feedings: Feeding[] = [
        {
          id: 'f1',
          petId: 'pet1',
          timestamp: '2026-08-15T08:10:00Z',
          foodName: 'Fancy Feast',
          amount: '1 can',
          appetitePercent: 100,
        },
      ];
      const notes: HealthNote[] = [
        {
          id: 'n1',
          petId: 'pet1',
          timestamp: '2026-08-15T09:00:00Z',
          content: 'Purring and active',
          tags: ['energy'],
        },
      ];

      const normalized = normalizeEvents(readings, doses, feedings, notes);
      expect(normalized).toHaveLength(4);
      // Most recent first: note (09:00), feeding (08:10), dose (08:05), reading (08:00)
      expect(normalized[0].type).toBe('note');
      expect(normalized[1].type).toBe('feeding');
      expect(normalized[2].type).toBe('dose');
      expect(normalized[3].type).toBe('reading');
    });
  });

  describe('getCycleDesignation', () => {
    it('assigns daytime hours (06:00 to 17:59) to the AM Cycle of the same calendar day', () => {
      const date1 = new Date(2026, 7, 15, 8, 30); // 08:30 AM
      const res1 = getCycleDesignation(date1);
      expect(res1.designation).toBe('AM');
      expect(res1.key).toBe('2026-08-15-AM');

      const date2 = new Date(2026, 7, 15, 17, 59); // 05:59 PM
      const res2 = getCycleDesignation(date2);
      expect(res2.designation).toBe('AM');
      expect(res2.key).toBe('2026-08-15-AM');
    });

    it('assigns evening hours (18:00 to 23:59) to the PM Cycle of the same calendar day', () => {
      const date1 = new Date(2026, 7, 15, 18, 0); // 06:00 PM
      const res1 = getCycleDesignation(date1);
      expect(res1.designation).toBe('PM');
      expect(res1.key).toBe('2026-08-15-PM');

      const date2 = new Date(2026, 7, 15, 23, 45); // 11:45 PM
      const res2 = getCycleDesignation(date2);
      expect(res2.designation).toBe('PM');
      expect(res2.key).toBe('2026-08-15-PM');
    });

    it('assigns post-midnight hours (00:00 to 05:59) to the PM Cycle of the PREVIOUS calendar day', () => {
      // 2026-08-16 at 02:30 AM is part of the 2026-08-15 PM Cycle
      const date = new Date(2026, 7, 16, 2, 30);
      const res = getCycleDesignation(date);
      expect(res.designation).toBe('PM');
      expect(res.key).toBe('2026-08-15-PM');
    });
  });

  describe('calculateCycleOffset', () => {
    const anchorDose: Dose = {
      id: 'd1',
      petId: 'pet1',
      timestamp: '2026-08-15T08:00:00.000Z',
      units: 2.0,
      insulinName: 'ProZinc',
    };

    it('returns AMPS / PMPS when reading occurs at injection time (-30m to +15m)', () => {
      // 5 minutes before dose
      expect(calculateCycleOffset('2026-08-15T07:55:00.000Z', anchorDose, 'AM')).toBe('AMPS');
      // 10 minutes after dose
      expect(calculateCycleOffset('2026-08-15T08:10:00.000Z', anchorDose, 'AM')).toBe('AMPS');
      // PM cycle check
      expect(calculateCycleOffset('2026-08-15T08:00:00.000Z', anchorDose, 'PM')).toBe('PMPS');
    });

    it('returns +Xh or +X.Xh when reading is taken hours after dose', () => {
      // Exactly 3 hours after dose (11:00)
      expect(calculateCycleOffset('2026-08-15T11:00:00.000Z', anchorDose, 'AM')).toBe('+3h');
      // 4 hours 30 mins after dose (12:30)
      expect(calculateCycleOffset('2026-08-15T12:30:00.000Z', anchorDose, 'AM')).toBe('+4.5h');
      // 6 hours after dose (14:00) -> typical Nadir time
      expect(calculateCycleOffset('2026-08-15T14:00:00.000Z', anchorDose, 'AM')).toBe('+6h');
    });

    it('returns null if no anchor dose is present', () => {
      expect(calculateCycleOffset('2026-08-15T11:00:00.000Z', null, 'AM')).toBeNull();
    });
  });

  describe('groupEventsIntoCycles & Nadir Calculations', () => {
    it('groups events into structured cycles and accurately identifies the Nadir and averages', () => {
      const readings: Reading[] = [
        // AM Cycle (2026-08-15)
        {
          id: 'r1',
          petId: 'pet1',
          timestamp: '2026-08-15T08:00:00',
          valueMgDl: 280,
        },
        {
          id: 'r2',
          petId: 'pet1',
          timestamp: '2026-08-15T14:00:00',
          valueMgDl: 95, // Nadir
        },
        {
          id: 'r3',
          petId: 'pet1',
          timestamp: '2026-08-15T17:00:00',
          valueMgDl: 160,
        },
      ];

      const doses: Dose[] = [
        {
          id: 'd1',
          petId: 'pet1',
          timestamp: '2026-08-15T08:05:00',
          units: 1.5,
          insulinName: 'Lantus',
        },
      ];

      const events = normalizeEvents(readings, doses, [], []);
      const cycles = groupEventsIntoCycles(events);

      expect(cycles).toHaveLength(1);
      const amCycle = cycles[0];
      expect(amCycle.cycleDesignation).toBe('AM');
      expect(amCycle.anchorDose?.id).toBe('d1');
      expect(amCycle.minBgMgDl).toBe(95);
      expect(amCycle.maxBgMgDl).toBe(280);
      expect(amCycle.nadirReading?.id).toBe('r2');
      expect(amCycle.nadirReading?.valueMgDl).toBe(95);
      // (280 + 95 + 160) / 3 = 535 / 3 = 178.33 -> 178
      expect(amCycle.avgBgMgDl).toBe(178);
    });
  });
});

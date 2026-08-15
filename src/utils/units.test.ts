import { describe, it, expect } from 'vitest';
import { mgDlToMmolL, mmolLToMgDl, formatBgValue, getBgStatus } from './units';
import type { Pet } from '../types';

describe('Units & Glycemic Status Seam', () => {
  describe('mg/dL <-> mmol/L Conversions', () => {
    it('converts mg/dL to mmol/L with 1 decimal precision', () => {
      // 100 / 18.0182 = 5.549... -> 5.5
      expect(mgDlToMmolL(100)).toBe(5.5);
      // 180 / 18.0182 = 9.99 -> 10.0
      expect(mgDlToMmolL(180)).toBe(10.0);
      // 54 / 18.0182 = 2.997 -> 3.0
      expect(mgDlToMmolL(54)).toBe(3.0);
      // 0 mg/dL -> 0.0
      expect(mgDlToMmolL(0)).toBe(0);
    });

    it('converts mmol/L to mg/dL as rounded integer', () => {
      // 5.5 * 18.0182 = 99.1 -> 99
      expect(mmolLToMgDl(5.5)).toBe(99);
      // 10.0 * 18.0182 = 180.18 -> 180
      expect(mmolLToMgDl(10.0)).toBe(180);
      // 3.0 * 18.0182 = 54.05 -> 54
      expect(mmolLToMgDl(3.0)).toBe(54);
    });

    it('formats blood glucose values according to the requested unit', () => {
      expect(formatBgValue(100, 'mg/dL')).toBe('100');
      expect(formatBgValue(100, 'mmol/L')).toBe('5.5');
      expect(formatBgValue(180.4, 'mg/dL')).toBe('180');
      expect(formatBgValue(180, 'mmol/L')).toBe('10.0');
    });
  });

  describe('Glycemic Status Categorization (getBgStatus)', () => {
    const mockPet: Pet = {
      id: 'pet_test',
      name: 'Milo',
      avatarEmoji: '🐱',
      insulinName: 'Lantus (Glargine)',
      defaultDoseUnits: 1.5,
      targetMinMgDl: 80,
      targetMaxMgDl: 150,
      hypoThresholdMgDl: 70,
      highThresholdMgDl: 250,
      scheduledAmTime: '08:00',
      scheduledPmTime: '20:00',
      createdAt: '2026-01-01T00:00:00Z',
    };

    it('identifies hypo alert when value is below hypo threshold', () => {
      const status = getBgStatus(65, mockPet);
      expect(status.category).toBe('hypo');
      expect(status.label).toBe('Low / Hypo Alert');
    });

    it('identifies target range when value is between hypo and targetMax', () => {
      const statusAtMin = getBgStatus(70, mockPet);
      expect(statusAtMin.category).toBe('target');

      const statusAtMax = getBgStatus(150, mockPet);
      expect(statusAtMax.category).toBe('target');
      expect(statusAtMax.label).toBe('In Target Range');
    });

    it('identifies elevated range when value is between targetMax and highThreshold', () => {
      const status = getBgStatus(180, mockPet);
      expect(status.category).toBe('elevated');
      expect(status.label).toBe('Elevated');
    });

    it('identifies high glucose when value exceeds high threshold', () => {
      const status = getBgStatus(300, mockPet);
      expect(status.category).toBe('high');
      expect(status.label).toBe('High Glucose');
    });

    it('uses fallback thresholds when pet profile is not supplied', () => {
      // Default fallback: hypo < 80, target <= 150, elevated <= 250, high > 250
      expect(getBgStatus(75, null).category).toBe('hypo');
      expect(getBgStatus(120, null).category).toBe('target');
      expect(getBgStatus(200, null).category).toBe('elevated');
      expect(getBgStatus(350, null).category).toBe('high');
    });
  });
});

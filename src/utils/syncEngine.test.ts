import { describe, it, expect } from 'vitest';
import { mergeHouseholdPayloads, isDefaultSampleData, getSyncState, updateSyncState } from './syncEngine';
import { isStandalonePwa, isIosDevice } from './platform';
import type { HouseholdDataPayload, Pet } from '../types';

describe('Sync Engine & 3-Way Reconciliation Seam', () => {
  const samplePet: Pet = {
    id: 'pet_default_milo',
    name: 'Milo',
    avatarEmoji: '🐱',
    insulinName: 'Lantus (Glargine)',
    defaultDoseUnits: 1.5,
    targetMinMgDl: 80,
    targetMaxMgDl: 150,
    hypoThresholdMgDl: 80,
    highThresholdMgDl: 250,
    scheduledAmTime: '08:00',
    scheduledPmTime: '20:00',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  describe('PWA Device Detection Helpers', () => {
    it('returns false when window or display-mode matchMedia is not standalone', () => {
      expect(isStandalonePwa()).toBe(false);
    });

    it('identifies non-iOS default test environment correctly', () => {
      expect(isIosDevice()).toBe(false);
    });
  });

  describe('Sync State Management', () => {
    it('updates and retrieves sync state accurately', () => {
      updateSyncState({ status: 'offline', errorMessage: 'Offline (changes saved locally).' });
      const state = getSyncState();
      expect(state.status).toBe('offline');
      expect(state.errorMessage).toBe('Offline (changes saved locally).');
    });
  });

  describe('isDefaultSampleData', () => {
    it('returns true when payload contains only untouched sample data', () => {
      const payload: HouseholdDataPayload = {
        version: 1,
        lastModified: '2026-01-01T00:00:00Z',
        pets: [samplePet],
        readings: [
          {
            id: 'reading_am_1',
            petId: 'pet_default_milo',
            timestamp: '2026-01-01T08:00:00Z',
            valueMgDl: 120,
          },
        ],
        doses: [
          {
            id: 'dose_am_1',
            petId: 'pet_default_milo',
            timestamp: '2026-01-01T08:05:00Z',
            units: 1.5,
            insulinName: 'Lantus (Glargine)',
          },
        ],
        feedings: [
          {
            id: 'feed_am_1',
            petId: 'pet_default_milo',
            timestamp: '2026-01-01T08:10:00Z',
            foodName: 'Sample Food',
            amount: '1 can',
            appetitePercent: 100,
          },
        ],
        foodPresets: [],
        healthNotes: [],
        settings: [],
        tombstones: [],
      };

      expect(isDefaultSampleData(payload)).toBe(true);
    });

    it('returns false when real user records or additional pets exist', () => {
      const payloadWithUserReading: HouseholdDataPayload = {
        version: 1,
        lastModified: '2026-01-01T00:00:00Z',
        pets: [samplePet],
        readings: [
          {
            id: 'reading_user_real_999',
            petId: 'pet_default_milo',
            timestamp: '2026-08-15T08:00:00Z',
            valueMgDl: 145,
          },
        ],
        doses: [],
        feedings: [],
        foodPresets: [],
        healthNotes: [],
        settings: [],
        tombstones: [],
      };

      expect(isDefaultSampleData(payloadWithUserReading)).toBe(false);
    });
  });

  describe('mergeHouseholdPayloads', () => {
    it('merges disjoint records from local and remote payloads', () => {
      const local: HouseholdDataPayload = {
        version: 1,
        lastModified: '2026-08-15T10:00:00Z',
        pets: [samplePet],
        readings: [
          {
            id: 'r_local_1',
            petId: samplePet.id,
            timestamp: '2026-08-15T08:00:00Z',
            valueMgDl: 130,
          },
        ],
        doses: [],
        feedings: [],
        foodPresets: [],
        healthNotes: [],
        settings: [],
        tombstones: [],
      };

      const remote: HouseholdDataPayload = {
        version: 1,
        lastModified: '2026-08-15T10:05:00Z',
        pets: [samplePet],
        readings: [
          {
            id: 'r_remote_2',
            petId: samplePet.id,
            timestamp: '2026-08-15T12:00:00Z',
            valueMgDl: 110,
          },
        ],
        doses: [
          {
            id: 'd_remote_1',
            petId: samplePet.id,
            timestamp: '2026-08-15T08:05:00Z',
            units: 1.5,
            insulinName: 'Lantus',
          },
        ],
        feedings: [],
        foodPresets: [],
        healthNotes: [],
        settings: [],
        tombstones: [],
      };

      const merged = mergeHouseholdPayloads(local, remote);
      expect(merged.readings).toHaveLength(2);
      expect(merged.readings.map((r) => r.id).sort()).toEqual(['r_local_1', 'r_remote_2']);
      expect(merged.doses).toHaveLength(1);
      expect(merged.doses[0].id).toBe('d_remote_1');
    });

    it('propagates tombstones and deletes matching records across local and remote', () => {
      const deletedReadingId = 'reading_to_delete_123';

      const local: HouseholdDataPayload = {
        version: 1,
        lastModified: '2026-08-15T11:00:00Z',
        pets: [samplePet],
        readings: [],
        doses: [],
        feedings: [],
        foodPresets: [],
        healthNotes: [],
        settings: [],
        tombstones: [
          {
            id: deletedReadingId,
            entityType: 'reading',
            deletedAt: '2026-08-15T10:30:00Z',
          },
        ],
      };

      const remote: HouseholdDataPayload = {
        version: 1,
        lastModified: '2026-08-15T09:00:00Z',
        pets: [samplePet],
        readings: [
          {
            id: deletedReadingId,
            petId: samplePet.id,
            timestamp: '2026-08-15T08:00:00Z',
            valueMgDl: 150,
          },
          {
            id: 'reading_keep_456',
            petId: samplePet.id,
            timestamp: '2026-08-15T12:00:00Z',
            valueMgDl: 120,
          },
        ],
        doses: [],
        feedings: [],
        foodPresets: [],
        healthNotes: [],
        settings: [],
        tombstones: [],
      };

      const merged = mergeHouseholdPayloads(local, remote);
      // deletedReadingId must be pruned
      expect(merged.readings).toHaveLength(1);
      expect(merged.readings[0].id).toBe('reading_keep_456');
      // Tombstone is preserved in merged payload for future sync peers
      expect(merged.tombstones).toHaveLength(1);
      expect(merged.tombstones[0].id).toBe(deletedReadingId);
    });

    it('deduplicates tombstones retaining the most recent timestamp', () => {
      const local: HouseholdDataPayload = {
        version: 1,
        lastModified: '2026-08-15T12:00:00Z',
        pets: [samplePet],
        readings: [],
        doses: [],
        feedings: [],
        foodPresets: [],
        healthNotes: [],
        settings: [],
        tombstones: [
          { id: 'item_1', entityType: 'reading', deletedAt: '2026-08-15T10:00:00Z' },
        ],
      };

      const remote: HouseholdDataPayload = {
        version: 1,
        lastModified: '2026-08-15T12:00:00Z',
        pets: [samplePet],
        readings: [],
        doses: [],
        feedings: [],
        foodPresets: [],
        healthNotes: [],
        settings: [],
        tombstones: [
          { id: 'item_1', entityType: 'reading', deletedAt: '2026-08-15T11:30:00Z' },
          { id: 'item_2', entityType: 'dose', deletedAt: '2026-08-15T09:00:00Z' },
        ],
      };

      const merged = mergeHouseholdPayloads(local, remote);
      expect(merged.tombstones).toHaveLength(2);
      const tomb1 = merged.tombstones.find((t) => t.id === 'item_1');
      expect(tomb1?.deletedAt).toBe('2026-08-15T11:30:00Z');
    });
  });
});

import Dexie, { type EntityTable } from 'dexie';
import type {
  Pet,
  Reading,
  Dose,
  Feeding,
  FoodPreset,
  HealthNote,
  UserSettings,
  Tombstone,
} from '../types';

export class SugarBabyDatabase extends Dexie {
  pets!: EntityTable<Pet, 'id'>;
  readings!: EntityTable<Reading, 'id'>;
  doses!: EntityTable<Dose, 'id'>;
  feedings!: EntityTable<Feeding, 'id'>;
  foodPresets!: EntityTable<FoodPreset, 'id'>;
  healthNotes!: EntityTable<HealthNote, 'id'>;
  settings!: EntityTable<UserSettings, 'id'>;
  tombstones!: EntityTable<Tombstone, 'id'>;

  constructor() {
    super('SugarBabyDB');
    this.version(1).stores({
      pets: 'id, name, createdAt',
      readings: 'id, petId, timestamp, valueMgDl',
      doses: 'id, petId, timestamp, units',
      feedings: 'id, petId, timestamp, foodPresetId',
      foodPresets: 'id, petId, orderIndex',
      healthNotes: 'id, petId, timestamp',
      settings: 'id, activePetId',
      tombstones: 'id, entityType, deletedAt',
    });
  }
}

export const db = new SugarBabyDatabase();

export async function recordTombstone(
  id: string,
  entityType: Tombstone['entityType']
): Promise<void> {
  try {
    await db.tombstones.put({
      id,
      entityType,
      deletedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to record tombstone:', err);
  }
}

export async function purgeExpiredTombstones(maxAgeDays = 60): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
    await db.tombstones.where('deletedAt').below(cutoff).delete();
  } catch (err) {
    console.error('Failed to purge expired tombstones:', err);
  }
}


export async function initializeDatabase(): Promise<void> {
  const settingsCount = await db.settings.count();
  if (settingsCount > 0) {
    return;
  }

  const defaultPetId = 'pet_default_milo';
  const now = new Date();

  // Create default Pet
  const defaultPet: Pet = {
    id: defaultPetId,
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
    createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  // Create default Food Presets
  const defaultPresets: FoodPreset[] = [
    {
      id: 'preset_1',
      petId: defaultPetId,
      name: "Dr. Elsey's cleanprotein Chicken Kibble",
      amount: '1 tbsp',
      orderIndex: 0,
    },
    {
      id: 'preset_2',
      petId: defaultPetId,
      name: 'Fancy Feast Classic Pate Turkey',
      amount: '1/2 can',
      orderIndex: 1,
    },
    {
      id: 'preset_3',
      petId: defaultPetId,
      name: 'Tiki Cat After Dark Chicken & Quail',
      amount: '1 can',
      orderIndex: 2,
    },
    {
      id: 'preset_4',
      petId: defaultPetId,
      name: 'Freeze-Dried Chicken Snack',
      amount: '3 pieces',
      orderIndex: 3,
    },
  ];

  // Default User Settings
  const defaultSettings: UserSettings = {
    id: 'user_settings_primary',
    activePetId: defaultPetId,
    bgUnit: 'mg/dL',
    defaultTimeWindow: '7D',
    chartViewMode: 'timeline',
    showAdvancedCycleMetrics: false,
  };

  // Generate realistic sample data for the past 5 days
  const sampleReadings: Reading[] = [];
  const sampleDoses: Dose[] = [];
  const sampleFeedings: Feeding[] = [];
  const sampleNotes: HealthNote[] = [];

  for (let dayOffset = 4; dayOffset >= 0; dayOffset--) {
    const dayDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    const dateStr = dayDate.toISOString().split('T')[0];

    // AM Cycle (around 8:00 AM)
    const amShotTime = new Date(`${dateStr}T08:00:00`).toISOString();
    const amMealTime = new Date(`${dateStr}T08:10:00`).toISOString();
    const amMidTime = new Date(`${dateStr}T12:30:00`).toISOString();
    const amPreTime = new Date(`${dateStr}T07:55:00`).toISOString();

    sampleReadings.push({
      id: `reading_am_pre_${dayOffset}`,
      petId: defaultPetId,
      timestamp: amPreTime,
      valueMgDl: 210 + Math.floor(Math.random() * 35) - 15,
      cycleTag: 'AMPS',
    });

    sampleDoses.push({
      id: `dose_am_${dayOffset}`,
      petId: defaultPetId,
      timestamp: amShotTime,
      units: 1.5,
      injectionSite: dayOffset % 2 === 0 ? 'Right Flank' : 'Left Flank',
      insulinName: 'Lantus (Glargine)',
    });

    sampleFeedings.push({
      id: `feed_am_${dayOffset}`,
      petId: defaultPetId,
      timestamp: amMealTime,
      foodPresetId: 'preset_1',
      foodName: "Dr. Elsey's cleanprotein Chicken Kibble",
      amount: '1 tbsp',
      appetitePercent: 100,
    });

    // +4.5h Nadir reading
    sampleReadings.push({
      id: `reading_am_nadir_${dayOffset}`,
      petId: defaultPetId,
      timestamp: amMidTime,
      valueMgDl: 105 + Math.floor(Math.random() * 25) - 10,
      cycleTag: '+4.5',
    });

    // PM Cycle (around 8:00 PM)
    const pmShotTime = new Date(`${dateStr}T20:00:00`).toISOString();
    const pmMealTime = new Date(`${dateStr}T20:15:00`).toISOString();
    const pmPreTime = new Date(`${dateStr}T19:55:00`).toISOString();
    const pmMidTime = new Date(`${dateStr}T23:45:00`).toISOString();

    sampleReadings.push({
      id: `reading_pm_pre_${dayOffset}`,
      petId: defaultPetId,
      timestamp: pmPreTime,
      valueMgDl: 195 + Math.floor(Math.random() * 30) - 10,
      cycleTag: 'PMPS',
    });

    sampleDoses.push({
      id: `dose_pm_${dayOffset}`,
      petId: defaultPetId,
      timestamp: pmShotTime,
      units: 1.5,
      injectionSite: dayOffset % 2 === 0 ? 'Left Shoulder' : 'Right Shoulder',
      insulinName: 'Lantus (Glargine)',
    });

    sampleFeedings.push({
      id: `feed_pm_${dayOffset}`,
      petId: defaultPetId,
      timestamp: pmMealTime,
      foodPresetId: 'preset_2',
      foodName: 'Fancy Feast Classic Pate Turkey',
      amount: '1/2 can',
      appetitePercent: 90 + Math.floor(Math.random() * 10),
    });

    // Late PM Nadir reading
    sampleReadings.push({
      id: `reading_pm_nadir_${dayOffset}`,
      petId: defaultPetId,
      timestamp: pmMidTime,
      valueMgDl: 98 + Math.floor(Math.random() * 20) - 10,
      cycleTag: '+4',
    });
  }

  // Sample Note
  sampleNotes.push({
    id: 'note_sample_1',
    petId: defaultPetId,
    timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    content: 'Milo purred while eating breakfast, energetic all morning. Normal litter box activity.',
    tags: ['Playful', 'Active'],
    weightValue: 11.4,
    weightUnit: 'lbs',
  });

  await db.pets.add(defaultPet);
  await db.foodPresets.bulkAdd(defaultPresets);
  await db.settings.add(defaultSettings);
  await db.readings.bulkAdd(sampleReadings);
  await db.doses.bulkAdd(sampleDoses);
  await db.feedings.bulkAdd(sampleFeedings);
  await db.healthNotes.bulkAdd(sampleNotes);
}

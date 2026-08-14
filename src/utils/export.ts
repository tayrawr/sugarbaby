import { format, parseISO } from 'date-fns';
import type { Pet, Reading, Dose, Feeding, HealthNote, BgUnit } from '../types';
import { formatBgValue } from './units';
import { db } from '../db';

export function exportToCsv(
  pet: Pet,
  readings: Reading[],
  doses: Dose[],
  feedings: Feeding[],
  notes: HealthNote[],
  unit: BgUnit
): string {
  const rows: string[] = [
    ['Timestamp', 'Date', 'Time', 'Event Type', 'Details / Measurement', 'Unit', 'Cycle Tag / Note'].join(','),
  ];

  // Combine and sort events
  const allEvents: { time: string; type: string; details: string; unitCol: string; noteCol: string }[] = [];

  for (const r of readings) {
    allEvents.push({
      time: r.timestamp,
      type: 'Reading',
      details: formatBgValue(r.valueMgDl, unit),
      unitCol: unit,
      noteCol: `"${[r.cycleTag, r.note].filter(Boolean).join(' - ')}"`,
    });
  }

  for (const d of doses) {
    allEvents.push({
      time: d.timestamp,
      type: 'Dose',
      details: d.units.toString(),
      unitCol: 'Units (U)',
      noteCol: `"${[d.injectionSite, d.insulinName ?? pet.insulinName, d.note].filter(Boolean).join(' - ')}"`,
    });
  }

  for (const f of feedings) {
    allEvents.push({
      time: f.timestamp,
      type: 'Feeding',
      details: `"${f.foodName} (${f.amount})"`,
      unitCol: `${f.appetitePercent}% Appetite`,
      noteCol: `"${f.note ?? ''}"`,
    });
  }

  for (const n of notes) {
    allEvents.push({
      time: n.timestamp,
      type: 'Health Note',
      details: `"${n.content.replace(/"/g, '""')}"`,
      unitCol: n.weightValue ? `${n.weightValue} ${n.weightUnit || 'lbs'}` : '',
      noteCol: `"${(n.tags || []).join(', ')}"`,
    });
  }

  allEvents.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  for (const ev of allEvents) {
    const d = parseISO(ev.time);
    rows.push([
      ev.time,
      format(d, 'yyyy-MM-dd'),
      format(d, 'hh:mm a'),
      ev.type,
      ev.details,
      ev.unitCol,
      ev.noteCol,
    ].join(','));
  }

  return rows.join('\n');
}

export function downloadFile(content: string, fileName: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportCompleteBackupJson(): Promise<string> {
  const [pets, readings, doses, feedings, foodPresets, healthNotes, settings, tombstones] = await Promise.all([
    db.pets.toArray(),
    db.readings.toArray(),
    db.doses.toArray(),
    db.feedings.toArray(),
    db.foodPresets.toArray(),
    db.healthNotes.toArray(),
    db.settings.toArray(),
    db.tombstones.toArray(),
  ]);

  const backupData = {
    version: 1,
    exportDate: new Date().toISOString(),
    pets,
    readings,
    doses,
    feedings,
    foodPresets,
    healthNotes,
    settings,
    tombstones,
  };

  return JSON.stringify(backupData, null, 2);
}

export async function restoreCompleteBackupJson(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.pets || !Array.isArray(data.pets)) {
      throw new Error('Invalid SugarBaby backup file structure.');
    }

    await db.transaction(
      'rw',
      [db.pets, db.readings, db.doses, db.feedings, db.foodPresets, db.healthNotes, db.settings, db.tombstones],
      async () => {
        await db.pets.clear();
        await db.readings.clear();
        await db.doses.clear();
        await db.feedings.clear();
        await db.foodPresets.clear();
        await db.healthNotes.clear();
        await db.settings.clear();
        await db.tombstones.clear();

        if (data.pets?.length) await db.pets.bulkAdd(data.pets);
        if (data.readings?.length) await db.readings.bulkAdd(data.readings);
        if (data.doses?.length) await db.doses.bulkAdd(data.doses);
        if (data.feedings?.length) await db.feedings.bulkAdd(data.feedings);
        if (data.foodPresets?.length) await db.foodPresets.bulkAdd(data.foodPresets);
        if (data.healthNotes?.length) await db.healthNotes.bulkAdd(data.healthNotes);
        if (data.settings?.length) await db.settings.bulkAdd(data.settings);
        if (data.tombstones?.length) await db.tombstones.bulkAdd(data.tombstones);
      }
    );

    return true;
  } catch (err) {
    console.error('Failed to restore backup:', err);
    return false;
  }
}


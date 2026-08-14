import { db, purgeExpiredTombstones } from '../db';
import type {
  HouseholdDataPayload,
  GoogleDriveSyncState,
  Tombstone,
  Pet,
  Reading,
  Dose,
  Feeding,
  FoodPreset,
  HealthNote,
} from '../types';
import {
  getStoredToken,
  getStoredFileId,
  setStoredFileId,
  getStoredFileLink,
  setStoredFileLink,
  getLastSyncTime,
  setLastSyncTime,
  isAutoSyncEnabled,
  getValidAccessToken,
  findHouseholdFileOnDrive,
  createHouseholdFileOnDrive,
  readHouseholdFileFromDrive,
  writeHouseholdFileToDrive,
  getFileMetadataFromDrive,
  extractFileIdFromInput,
} from './googleDrive';

type SyncStateListener = (state: GoogleDriveSyncState) => void;
const listeners = new Set<SyncStateListener>();

let currentSyncState: GoogleDriveSyncState = {
  isSignedIn: !!getStoredToken()?.access_token,
  userEmail: getStoredToken()?.email || null,
  userName: getStoredToken()?.name || null,
  userAvatar: getStoredToken()?.picture || null,
  fileId: getStoredFileId(),
  fileName: 'SugarBaby_Household.json',
  webViewLink: getStoredFileLink(),
  lastSyncedAt: getLastSyncTime(),
  status: 'idle',
  errorMessage: null,
  isAutoSyncEnabled: isAutoSyncEnabled(),
};

export function getSyncState(): GoogleDriveSyncState {
  return { ...currentSyncState };
}

export function updateSyncState(patch: Partial<GoogleDriveSyncState>): void {
  currentSyncState = { ...currentSyncState, ...patch };
  listeners.forEach((listener) => {
    try {
      listener(currentSyncState);
    } catch (err) {
      console.error('Error in sync state listener:', err);
    }
  });
}

export function subscribeToSyncState(listener: SyncStateListener): () => void {
  listeners.add(listener);
  listener(currentSyncState);
  return () => {
    listeners.delete(listener);
  };
}

// Gather all household records from local Dexie IndexedDB
export async function getLocalHouseholdPayload(): Promise<HouseholdDataPayload> {
  const [pets, readings, doses, feedings, foodPresets, healthNotes, settings, tombstones] =
    await Promise.all([
      db.pets.toArray(),
      db.readings.toArray(),
      db.doses.toArray(),
      db.feedings.toArray(),
      db.foodPresets.toArray(),
      db.healthNotes.toArray(),
      db.settings.toArray(),
      db.tombstones.toArray(),
    ]);

  return {
    version: 1,
    lastModified: new Date().toISOString(),
    pets,
    readings,
    doses,
    feedings,
    foodPresets,
    healthNotes,
    settings,
    tombstones,
  };
}

// Check if local database only contains untouched initial sample data (pet_default_milo)
export function isDefaultSampleData(payload: HouseholdDataPayload): boolean {
  if (payload.pets.length !== 1) return false;
  const onlyPet = payload.pets[0];
  if (onlyPet.id !== 'pet_default_milo') return false;

  // If readings are all sample reading IDs (starting with reading_am_ or reading_pm_)
  const nonSampleReadings = payload.readings.filter(
    (r) => !r.id.startsWith('reading_am_') && !r.id.startsWith('reading_pm_')
  );

  return nonSampleReadings.length === 0;
}

// Reconcile and merge local and remote payloads intelligently
export function mergeHouseholdPayloads(
  local: HouseholdDataPayload,
  remote: HouseholdDataPayload
): HouseholdDataPayload {
  // 1. Merge & deduplicate tombstones
  const tombstoneMap = new Map<string, Tombstone>();
  for (const t of [...(local.tombstones || []), ...(remote.tombstones || [])]) {
    const existing = tombstoneMap.get(t.id);
    if (!existing || new Date(t.deletedAt) > new Date(existing.deletedAt)) {
      tombstoneMap.set(t.id, t);
    }
  }

  const combinedTombstones = Array.from(tombstoneMap.values());
  const deletedIdSet = new Set<string>(combinedTombstones.map((t) => t.id));

  // Helper to merge arrays of entities by unique ID while filtering out tombstones
  function mergeEntities<T extends { id: string }>(localItems: T[] = [], remoteItems: T[] = []): T[] {
    const map = new Map<string, T>();

    // Add remote first
    for (const item of remoteItems) {
      if (!deletedIdSet.has(item.id)) {
        map.set(item.id, item);
      }
    }

    // Add/overwrite with local items
    for (const item of localItems) {
      if (!deletedIdSet.has(item.id)) {
        map.set(item.id, item);
      }
    }

    return Array.from(map.values());
  }

  const mergedPets: Pet[] = mergeEntities(local.pets, remote.pets);
  const mergedReadings: Reading[] = mergeEntities(local.readings, remote.readings);
  const mergedDoses: Dose[] = mergeEntities(local.doses, remote.doses);
  const mergedFeedings: Feeding[] = mergeEntities(local.feedings, remote.feedings);
  const mergedFoodPresets: FoodPreset[] = mergeEntities(local.foodPresets, remote.foodPresets);
  const mergedHealthNotes: HealthNote[] = mergeEntities(local.healthNotes, remote.healthNotes);

  // Settings: preserve local activePetId if valid in mergedPets, else fallback to remote
  const primarySettings = local.settings?.[0] || remote.settings?.[0] || {
    id: 'user_settings_primary',
    activePetId: mergedPets[0]?.id || 'pet_default_milo',
    bgUnit: 'mg/dL',
    defaultTimeWindow: '7D',
    chartViewMode: 'timeline',
    showAdvancedCycleMetrics: false,
  };

  if (mergedPets.length > 0 && !mergedPets.some((p) => p.id === primarySettings.activePetId)) {
    primarySettings.activePetId = mergedPets[0].id;
  }

  return {
    version: 1,
    lastModified: new Date().toISOString(),
    pets: mergedPets,
    readings: mergedReadings,
    doses: mergedDoses,
    feedings: mergedFeedings,
    foodPresets: mergedFoodPresets,
    healthNotes: mergedHealthNotes,
    settings: [primarySettings],
    tombstones: combinedTombstones,
  };
}

// Atomically write payload into Dexie database
export async function writeHouseholdPayloadToLocalDb(payload: HouseholdDataPayload): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.pets,
      db.readings,
      db.doses,
      db.feedings,
      db.foodPresets,
      db.healthNotes,
      db.settings,
      db.tombstones,
    ],
    async () => {
      await db.pets.clear();
      await db.readings.clear();
      await db.doses.clear();
      await db.feedings.clear();
      await db.foodPresets.clear();
      await db.healthNotes.clear();
      await db.settings.clear();
      await db.tombstones.clear();

      if (payload.pets?.length) await db.pets.bulkAdd(payload.pets);
      if (payload.readings?.length) await db.readings.bulkAdd(payload.readings);
      if (payload.doses?.length) await db.doses.bulkAdd(payload.doses);
      if (payload.feedings?.length) await db.feedings.bulkAdd(payload.feedings);
      if (payload.foodPresets?.length) await db.foodPresets.bulkAdd(payload.foodPresets);
      if (payload.healthNotes?.length) await db.healthNotes.bulkAdd(payload.healthNotes);
      if (payload.settings?.length) await db.settings.bulkAdd(payload.settings);
      if (payload.tombstones?.length) await db.tombstones.bulkAdd(payload.tombstones);
    }
  );
}

// Full Synchronize Execution
export async function synchronizeWithGoogleDrive(forcePullOnly = false): Promise<boolean> {
  const tokenData = getStoredToken();
  if (!tokenData) {
    updateSyncState({ status: 'offline', errorMessage: 'Not signed in with Google.' });
    return false;
  }

  if (currentSyncState.status === 'syncing') {
    return false;
  }

  updateSyncState({ status: 'syncing', errorMessage: null });

  try {
    const accessToken = await getValidAccessToken();
    let fileId = getStoredFileId();

    // Clean expired tombstones locally
    await purgeExpiredTombstones(60);

    const localPayload = await getLocalHouseholdPayload();

    // If no file ID is stored, check Google Drive to see if one already exists
    if (!fileId) {
      const existing = await findHouseholdFileOnDrive(accessToken);
      if (existing) {
        fileId = existing.id;
        setStoredFileId(fileId);
        setStoredFileLink(existing.webViewLink || null);
        updateSyncState({ fileId, webViewLink: existing.webViewLink || null });
      }
    }

    // If still no file exists on Drive, create one with local data!
    if (!fileId) {
      const created = await createHouseholdFileOnDrive(accessToken, localPayload);
      fileId = created.id;
      setStoredFileId(fileId);
      setStoredFileLink(created.webViewLink || null);

      const nowIso = new Date().toISOString();
      setLastSyncTime(nowIso);

      updateSyncState({
        fileId,
        webViewLink: created.webViewLink || null,
        lastSyncedAt: nowIso,
        status: 'synced',
        errorMessage: null,
      });

      return true;
    }

    // Remote file exists: fetch and reconcile
    const remotePayload = await readHouseholdFileFromDrive(accessToken, fileId);

    // Refresh file link if needed
    try {
      const metadata = await getFileMetadataFromDrive(accessToken, fileId);
      if (metadata.webViewLink) {
        setStoredFileLink(metadata.webViewLink);
        updateSyncState({ webViewLink: metadata.webViewLink });
      }
    } catch {
      // Non-critical
    }

    let finalPayload: HouseholdDataPayload;

    if (forcePullOnly) {
      finalPayload = remotePayload;
    } else if (isDefaultSampleData(localPayload) && remotePayload.pets?.length > 0) {
      // Smart clean sync: replace initial sample data with real remote household data
      finalPayload = remotePayload;
    } else {
      // Non-destructive bi-directional merge
      finalPayload = mergeHouseholdPayloads(localPayload, remotePayload);
    }

    // Write reconciled state into local Dexie
    await writeHouseholdPayloadToLocalDb(finalPayload);

    // Push merged state back to Google Drive (unless forced pull only)
    if (!forcePullOnly) {
      await writeHouseholdFileToDrive(accessToken, fileId, finalPayload);
    }

    const nowIso = new Date().toISOString();
    setLastSyncTime(nowIso);

    updateSyncState({
      lastSyncedAt: nowIso,
      status: 'synced',
      errorMessage: null,
    });

    return true;
  } catch (err: any) {
    console.error('Sync failed:', err);
    updateSyncState({
      status: 'error',
      errorMessage: err.message || 'Synchronization failed.',
    });
    return false;
  }
}

// Connect to an explicitly provided file (by ID or URL, e.g. for family members)
export async function connectToExistingSharedFile(input: string): Promise<boolean> {
  const fileId = extractFileIdFromInput(input);
  if (!fileId) {
    throw new Error('Please enter a valid Google Drive File ID or sharing link.');
  }

  const accessToken = await getValidAccessToken();
  updateSyncState({ status: 'syncing', errorMessage: null });

  try {
    const metadata = await getFileMetadataFromDrive(accessToken, fileId);
    const remotePayload = await readHouseholdFileFromDrive(accessToken, fileId);

    setStoredFileId(fileId);
    setStoredFileLink(metadata.webViewLink || null);

    const localPayload = await getLocalHouseholdPayload();
    let finalPayload: HouseholdDataPayload;

    if (isDefaultSampleData(localPayload)) {
      finalPayload = remotePayload;
    } else {
      finalPayload = mergeHouseholdPayloads(localPayload, remotePayload);
    }

    await writeHouseholdPayloadToLocalDb(finalPayload);
    await writeHouseholdFileToDrive(accessToken, fileId, finalPayload);

    const nowIso = new Date().toISOString();
    setLastSyncTime(nowIso);

    updateSyncState({
      fileId,
      fileName: metadata.name || 'SugarBaby_Household.json',
      webViewLink: metadata.webViewLink || null,
      lastSyncedAt: nowIso,
      status: 'synced',
      errorMessage: null,
    });

    return true;
  } catch (err: any) {
    updateSyncState({
      status: 'error',
      errorMessage: err.message || 'Failed to connect to shared file.',
    });
    throw err;
  }
}

// Debounced Auto-Sync trigger for local data mutations
let debouncedTimeout: any = null;

export function triggerDebouncedAutoSync(delayMs = 2500): void {
  if (!isAutoSyncEnabled() || !getStoredToken()) return;

  if (debouncedTimeout) {
    clearTimeout(debouncedTimeout);
  }

  debouncedTimeout = setTimeout(() => {
    synchronizeWithGoogleDrive().catch((err) => {
      console.warn('Debounced sync error:', err);
    });
  }, delayMs);
}

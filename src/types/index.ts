export type BgUnit = 'mg/dL' | 'mmol/L';

export type TimeWindow = 'TODAY' | '7D' | '14D' | '1M' | '3M' | 'ALL';

export type ChartViewMode = 'timeline' | 'overlaid12h';

export type CycleDesignation = 'AM' | 'PM';

export interface Pet {
  id: string;
  name: string;
  avatarEmoji: string;
  insulinName: string;
  defaultDoseUnits: number;
  targetMinMgDl: number; // default 80
  targetMaxMgDl: number; // default 150
  hypoThresholdMgDl: number; // default 80
  highThresholdMgDl: number; // default 250
  scheduledAmTime: string; // "08:00"
  scheduledPmTime: string; // "20:00"
  createdAt: string;
}

export interface Reading {
  id: string;
  petId: string;
  timestamp: string; // ISO string
  valueMgDl: number;
  cycleTag?: string; // e.g., 'AMPS', 'PMPS', '+3'
  note?: string;
}

export type InjectionSite =
  | 'Left Flank'
  | 'Right Flank'
  | 'Scruff'
  | 'Left Shoulder'
  | 'Right Shoulder'
  | 'Other';

export interface Dose {
  id: string;
  petId: string;
  timestamp: string; // ISO string
  units: number;
  injectionSite?: InjectionSite;
  insulinName?: string;
  note?: string;
}

export interface FoodPreset {
  id: string;
  petId: string;
  name: string;
  amount: string; // e.g. "1 tbsp", "1/2 can", "1/4 cup"
  orderIndex: number;
}

export interface Feeding {
  id: string;
  petId: string;
  timestamp: string; // ISO string
  foodPresetId?: string;
  foodName: string;
  amount: string;
  appetitePercent: number; // 0 to 100
  note?: string;
}

export interface HealthNote {
  id: string;
  petId: string;
  timestamp: string; // ISO string
  content: string;
  tags: string[];
  weightValue?: number;
  weightUnit?: 'lbs' | 'kg';
}

export interface UserSettings {
  id: string;
  activePetId: string;
  bgUnit: BgUnit;
  defaultTimeWindow: TimeWindow;
  chartViewMode: ChartViewMode;
  showAdvancedCycleMetrics: boolean;
}

export type TimelineEventType = 'reading' | 'dose' | 'feeding' | 'note';

export interface BaseTimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string;
  petId: string;
}

export interface ReadingEvent extends BaseTimelineEvent {
  type: 'reading';
  data: Reading;
}

export interface DoseEvent extends BaseTimelineEvent {
  type: 'dose';
  data: Dose;
}

export interface FeedingEvent extends BaseTimelineEvent {
  type: 'feeding';
  data: Feeding;
}

export interface NoteEvent extends BaseTimelineEvent {
  type: 'note';
  data: HealthNote;
}

export type TimelineEvent = ReadingEvent | DoseEvent | FeedingEvent | NoteEvent;

export interface CycleGroup {
  cycleKey: string; // e.g. "2026-08-13-AM"
  dateFormatted: string;
  cycleDesignation: CycleDesignation;
  scheduledTime: string;
  anchorDose?: Dose;
  events: TimelineEvent[];
  nadirReading?: Reading;
  avgBgMgDl?: number;
  minBgMgDl?: number;
  maxBgMgDl?: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface Tombstone {
  id: string;
  entityType: 'reading' | 'dose' | 'feeding' | 'foodPreset' | 'healthNote' | 'pet';
  deletedAt: string; // ISO string
}

export interface HouseholdDataPayload {
  version: number;
  lastModified: string;
  pets: Pet[];
  readings: Reading[];
  doses: Dose[];
  feedings: Feeding[];
  foodPresets: FoodPreset[];
  healthNotes: HealthNote[];
  settings: UserSettings[];
  tombstones: Tombstone[];
}

export interface GoogleDriveSyncState {
  isSignedIn: boolean;
  userEmail: string | null;
  userName: string | null;
  userAvatar: string | null;
  fileId: string | null;
  fileName: string | null;
  webViewLink: string | null;
  lastSyncedAt: string | null;
  status: SyncStatus;
  errorMessage: string | null;
  isAutoSyncEnabled: boolean;
  customClientId?: string;
}


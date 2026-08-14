import React, { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { subDays, startOfDay, parseISO } from 'date-fns';
import { db, initializeDatabase, recordTombstone } from './db';
import type {
  Reading,
  Dose,
  Feeding,
  HealthNote,
  TimeWindow,
  TimelineEvent,
} from './types';
import { normalizeEvents } from './utils/cycles';
import { AppHeader } from './components/layout/AppHeader';
import { BottomDock } from './components/layout/BottomDock';
import { CycleTimerCard } from './components/dashboard/CycleTimerCard';
import { MetricSummaryCards } from './components/dashboard/MetricSummaryCards';
import { GlucoseChart } from './components/dashboard/GlucoseChart';
import { TimelineFeed } from './components/timeline/TimelineFeed';
import { ReadingModal } from './components/modals/ReadingModal';
import { DoseModal } from './components/modals/DoseModal';
import { FeedingModal } from './components/modals/FeedingModal';
import { HealthNoteModal } from './components/modals/HealthNoteModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { FoodPresetManagerModal } from './components/modals/FoodPresetManagerModal';
import { VetReportModal } from './components/modals/VetReportModal';
import { AddPetModal } from './components/modals/AddPetModal';
import { GoogleDriveSyncModal } from './components/modals/GoogleDriveSyncModal';
import { synchronizeWithGoogleDrive, triggerDebouncedAutoSync } from './utils/syncEngine';
import { getStoredToken } from './utils/googleDrive';

export const App: React.FC = () => {
  const [isDbReady, setIsDbReady] = useState(false);
  const [activeTimeframe, setActiveTimeframe] = useState<TimeWindow>('7D');

  // Modal open states
  const [isReadingOpen, setIsReadingOpen] = useState(false);
  const [isDoseOpen, setIsDoseOpen] = useState(false);
  const [isFeedingOpen, setIsFeedingOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isVetReportOpen, setIsVetReportOpen] = useState(false);
  const [isAddPetOpen, setIsAddPetOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);

  // Editing state for existing records
  const [editingReading, setEditingReading] = useState<Reading | null>(null);
  const [editingDose, setEditingDose] = useState<Dose | null>(null);
  const [editingFeeding, setEditingFeeding] = useState<Feeding | null>(null);
  const [editingNote, setEditingNote] = useState<HealthNote | null>(null);

  // Initialize DB and background sync
  useEffect(() => {
    initializeDatabase().then(() => {
      setIsDbReady(true);

      // If user has active Google Drive connection, sync on startup
      if (getStoredToken()?.access_token) {
        synchronizeWithGoogleDrive().catch((err) => {
          console.warn('Initial sync notice:', err);
        });
      }
    });

    // Auto-sync when user returns to tab or network recovers
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && getStoredToken()?.access_token) {
        synchronizeWithGoogleDrive().catch(() => {});
      }
    };

    const handleOnline = () => {
      if (getStoredToken()?.access_token) {
        synchronizeWithGoogleDrive().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Live Queries from Dexie
  const settings = useLiveQuery(() => db.settings.toCollection().first(), [isDbReady]);
  const allPets = useLiveQuery(() => db.pets.toArray(), [isDbReady]) || [];
  const activePetId = settings?.activePetId || (allPets.length > 0 ? allPets[0].id : 'pet_default_milo');
  const pet = useLiveQuery(() => db.pets.get(activePetId), [activePetId, isDbReady]);

  const allReadings = useLiveQuery(
    () => db.readings.where('petId').equals(activePetId).reverse().sortBy('timestamp'),
    [activePetId, isDbReady]
  ) || [];

  const allDoses = useLiveQuery(
    () => db.doses.where('petId').equals(activePetId).reverse().sortBy('timestamp'),
    [activePetId, isDbReady]
  ) || [];

  const allFeedings = useLiveQuery(
    () => db.feedings.where('petId').equals(activePetId).reverse().sortBy('timestamp'),
    [activePetId, isDbReady]
  ) || [];

  const allNotes = useLiveQuery(
    () => db.healthNotes.where('petId').equals(activePetId).reverse().sortBy('timestamp'),
    [activePetId, isDbReady]
  ) || [];

  const foodPresets = useLiveQuery(
    () => db.foodPresets.where('petId').equals(activePetId).sortBy('orderIndex'),
    [activePetId, isDbReady]
  ) || [];

  // Filter events based on active timeframe
  const getFilterStartDate = useCallback((timeframe: TimeWindow): Date | null => {
    const now = new Date();
    switch (timeframe) {
      case 'TODAY':
        return startOfDay(now);
      case '7D':
        return subDays(now, 7);
      case '14D':
        return subDays(now, 14);
      case '1M':
        return subDays(now, 30);
      case '3M':
        return subDays(now, 90);
      case 'ALL':
        return null;
    }
  }, []);

  const filterStartDate = getFilterStartDate(activeTimeframe);

  const filterByDate = <T extends { timestamp: string }>(items: T[]): T[] => {
    if (!filterStartDate) return items;
    const startMs = filterStartDate.getTime();
    return items.filter((item) => parseISO(item.timestamp).getTime() >= startMs);
  };

  const filteredReadings = filterByDate(allReadings);
  const filteredDoses = filterByDate(allDoses);
  const filteredFeedings = filterByDate(allFeedings);
  const filteredNotes = filterByDate(allNotes);

  const filteredEvents = normalizeEvents(
    filteredReadings,
    filteredDoses,
    filteredFeedings,
    filteredNotes
  );

  const lastDose = allDoses.length > 0 ? allDoses[0] : null;

  const getTimeWindowLabel = (tf: TimeWindow): string => {
    switch (tf) {
      case 'TODAY': return 'Today';
      case '7D': return '7-Day';
      case '14D': return '14-Day';
      case '1M': return '30-Day';
      case '3M': return '90-Day';
      case 'ALL': return 'All-Time';
    }
  };

  const handleSelectPet = async (petId: string) => {
    if (settings) {
      await db.settings.update(settings.id, { activePetId: petId });
    }
  };

  // Event handlers
  const handleEditEvent = (event: TimelineEvent) => {
    switch (event.type) {
      case 'reading':
        setEditingReading(event.data);
        setIsReadingOpen(true);
        break;
      case 'dose':
        setEditingDose(event.data);
        setIsDoseOpen(true);
        break;
      case 'feeding':
        setEditingFeeding(event.data);
        setIsFeedingOpen(true);
        break;
      case 'note':
        setEditingNote(event.data);
        setIsNoteOpen(true);
        break;
    }
  };

  const handleDeleteEvent = async (event: TimelineEvent) => {
    if (!window.confirm(`Are you sure you want to delete this ${event.type} entry?`)) return;

    const entityType = event.type === 'note' ? 'healthNote' : event.type;
    await recordTombstone(event.id, entityType);

    switch (event.type) {
      case 'reading':
        await db.readings.delete(event.id);
        break;
      case 'dose':
        await db.doses.delete(event.id);
        break;
      case 'feeding':
        await db.feedings.delete(event.id);
        break;
      case 'note':
        await db.healthNotes.delete(event.id);
        break;
    }

    triggerDebouncedAutoSync();
  };

  if (!isDbReady || !pet || !settings) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="text-3xl animate-bounce">🐾</div>
          <p className="text-xs font-semibold tracking-wider uppercase">Loading SugarBaby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white pb-28">
      {/* Navigation Header */}
      <AppHeader
        pet={pet}
        allPets={allPets}
        settings={settings}
        activeTimeframe={activeTimeframe}
        onChangeTimeframe={setActiveTimeframe}
        onSelectPet={handleSelectPet}
        onAddNewPet={() => setIsAddPetOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenVetReport={() => setIsVetReportOpen(true)}
        onOpenSync={() => setIsSyncOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-5 space-y-5 flex-1">
        {/* Active Cycle Countdown Card */}
        <CycleTimerCard pet={pet} lastDose={lastDose} />

        {/* Clinical Metric Summary Cards */}
        <MetricSummaryCards
          pet={pet}
          readings={filteredReadings}
          bgUnit={settings.bgUnit}
          timeWindowLabel={getTimeWindowLabel(activeTimeframe)}
        />

        {/* Multi-Event Blood Glucose Chart */}
        <GlucoseChart
          pet={pet}
          readings={filteredReadings}
          doses={filteredDoses}
          feedings={filteredFeedings}
          notes={filteredNotes}
          bgUnit={settings.bgUnit}
        />

        {/* 12-Hour Cycle Timeline Feed */}
        <TimelineFeed
          events={filteredEvents}
          pet={pet}
          bgUnit={settings.bgUnit}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      </main>

      {/* Sticky Bottom Action Dock */}
      <BottomDock
        onOpenReading={() => {
          setEditingReading(null);
          setIsReadingOpen(true);
        }}
        onOpenDose={() => {
          setEditingDose(null);
          setIsDoseOpen(true);
        }}
        onOpenFeeding={() => {
          setEditingFeeding(null);
          setIsFeedingOpen(true);
        }}
        onOpenNote={() => {
          setEditingNote(null);
          setIsNoteOpen(true);
        }}
      />

      {/* Modals */}
      <ReadingModal
        isOpen={isReadingOpen}
        onClose={() => {
          setIsReadingOpen(false);
          setEditingReading(null);
        }}
        pet={pet}
        bgUnit={settings.bgUnit}
        editingReading={editingReading}
      />

      <DoseModal
        isOpen={isDoseOpen}
        onClose={() => {
          setIsDoseOpen(false);
          setEditingDose(null);
        }}
        pet={pet}
        lastDose={lastDose}
        allDoses={allDoses}
        editingDose={editingDose}
      />

      <FeedingModal
        isOpen={isFeedingOpen}
        onClose={() => {
          setIsFeedingOpen(false);
          setEditingFeeding(null);
        }}
        pet={pet}
        presets={foodPresets}
        editingFeeding={editingFeeding}
      />

      <HealthNoteModal
        isOpen={isNoteOpen}
        onClose={() => {
          setIsNoteOpen(false);
          setEditingNote(null);
        }}
        pet={pet}
        editingNote={editingNote}
      />

      <FoodPresetManagerModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        pet={pet}
        presets={foodPresets}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        pet={pet}
        allPets={allPets}
        settings={settings}
        onSelectPet={handleSelectPet}
        onAddNewPet={() => setIsAddPetOpen(true)}
        onOpenSync={() => setIsSyncOpen(true)}
      />

      <AddPetModal
        isOpen={isAddPetOpen}
        onClose={() => setIsAddPetOpen(false)}
        onPetAdded={(newPetId) => {
          handleSelectPet(newPetId);
        }}
      />

      <VetReportModal
        isOpen={isVetReportOpen}
        onClose={() => setIsVetReportOpen(false)}
        pet={pet}
        readings={allReadings}
        doses={allDoses}
        feedings={allFeedings}
        notes={allNotes}
        bgUnit={settings.bgUnit}
      />

      <GoogleDriveSyncModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
      />
    </div>
  );
};

export default App;

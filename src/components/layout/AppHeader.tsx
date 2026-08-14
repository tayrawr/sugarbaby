import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sparkles,
  FileText,
  Cloud,
  CloudCheck,
  CloudAlert,
  RefreshCw,
  Zap,
} from 'lucide-react';
import type { Pet, UserSettings, TimeWindow, GoogleDriveSyncState } from '../../types';
import { TimeframeSelector } from '../dashboard/TimeframeSelector';
import { PetSwitcher } from './PetSwitcher';
import { getSyncState, subscribeToSyncState, resumeGoogleSync } from '../../utils/syncEngine';

interface AppHeaderProps {
  pet: Pet;
  allPets: Pet[];
  settings: UserSettings;
  activeTimeframe: TimeWindow;
  onChangeTimeframe: (tf: TimeWindow) => void;
  onSelectPet: (petId: string) => void;
  onAddNewPet: () => void;
  onOpenSettings: () => void;
  onOpenPresets: () => void;
  onOpenVetReport: () => void;
  onOpenSync: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  pet,
  allPets,
  settings,
  activeTimeframe,
  onChangeTimeframe,
  onSelectPet,
  onAddNewPet,
  onOpenSettings,
  onOpenPresets,
  onOpenVetReport,
  onOpenSync,
}) => {
  const [syncState, setSyncState] = useState<GoogleDriveSyncState>(getSyncState());
  const [isResuming, setIsResuming] = useState(false);

  useEffect(() => {
    return subscribeToSyncState(setSyncState);
  }, []);

  const handleResumeSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResuming(true);
    try {
      const success = await resumeGoogleSync();
      if (!success) {
        onOpenSync();
      }
    } catch {
      onOpenSync();
    } finally {
      setIsResuming(false);
    }
  };

  const renderSyncBadge = (isMobile = false) => {
    if (!syncState.isSignedIn && !syncState.isLinked) {
      return (
        <button
          type="button"
          onClick={onOpenSync}
          className={`${
            isMobile ? 'p-2' : 'px-2.5 py-1.5'
          } rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors`}
          title="Connect Google Drive Cloud Sync"
        >
          <Cloud className="w-3.5 h-3.5" />
          {!isMobile && <span>Local</span>}
        </button>
      );
    }

    if (syncState.status === 'needs_reauth') {
      return (
        <button
          type="button"
          onClick={handleResumeSync}
          disabled={isResuming}
          className={`${
            isMobile ? 'p-2' : 'px-2.5 py-1.5'
          } rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-amber-500/10`}
          title="Google session expired. Click to resume cloud sync in 1 click."
        >
          {isResuming ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
          ) : (
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
          )}
          {!isMobile && <span>{isResuming ? 'Connecting...' : 'Resume Sync'}</span>}
        </button>
      );
    }

    if (syncState.status === 'syncing') {
      return (
        <button
          type="button"
          onClick={onOpenSync}
          className={`${
            isMobile ? 'p-2' : 'px-2.5 py-1.5'
          } rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors`}
          title="Syncing with Google Drive..."
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          {!isMobile && <span>Syncing</span>}
        </button>
      );
    }

    if (syncState.status === 'error') {
      return (
        <button
          type="button"
          onClick={onOpenSync}
          className={`${
            isMobile ? 'p-2' : 'px-2.5 py-1.5'
          } rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors`}
          title={syncState.errorMessage || 'Sync notice'}
        >
          <CloudAlert className="w-3.5 h-3.5" />
          {!isMobile && <span>Sync Alert</span>}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={onOpenSync}
        className={`${
          isMobile ? 'p-2' : 'px-2.5 py-1.5'
        } rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors`}
        title="Google Drive Connected & Up to Date"
      >
        <CloudCheck className="w-3.5 h-3.5" />
        {!isMobile && <span>Cloud Sync</span>}
      </button>
    );
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: App Logo & Pet Identity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-xl shadow-md shadow-rose-500/20">
              🐾
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  <span>SugarBaby</span>
                </h1>
                <PetSwitcher
                  pets={allPets}
                  activePet={pet}
                  onSelectPet={onSelectPet}
                  onAddNewPet={onAddNewPet}
                />
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {pet.insulinName} • Unit: <strong className="text-slate-300">{settings.bgUnit}</strong>
              </div>
            </div>
          </div>

          {/* Mobile Quick Action Buttons */}
          <div className="flex items-center gap-1.5 md:hidden">
            {renderSyncBadge(true)}
            <button
              type="button"
              onClick={onOpenPresets}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 transition-colors"
              title="Food Presets"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenVetReport}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 transition-colors"
              title="Vet Report"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Time Window Selector & Desktop Utility Buttons */}
        <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
          <TimeframeSelector value={activeTimeframe} onChange={onChangeTimeframe} />

          <div className="hidden md:flex items-center gap-2">
            {renderSyncBadge(false)}

            <button
              type="button"
              onClick={onOpenPresets}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Food Presets
            </button>

            <button
              type="button"
              onClick={onOpenVetReport}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> Vet Report
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};


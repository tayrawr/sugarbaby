import React, { useState, useEffect, useRef } from 'react';
import { Settings, Check, Download, Upload, RefreshCw, Heart, Plus, Trash2, Cloud } from 'lucide-react';
import { ModalSheet } from '../common/ModalSheet';
import type { Pet, UserSettings, BgUnit } from '../../types';
import { db, initializeDatabase, recordTombstone } from '../../db';
import { exportToCsv, exportCompleteBackupJson, restoreCompleteBackupJson, downloadFile } from '../../utils/export';
import { triggerDebouncedAutoSync } from '../../utils/syncEngine';
import { clearStoredToken, setStoredFileId } from '../../utils/googleDrive';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  allPets?: Pet[];
  settings: UserSettings;
  onSelectPet?: (petId: string) => void;
  onAddNewPet?: () => void;
  onUpdated?: () => void;
  onOpenSync?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  pet,
  allPets = [],
  settings,
  onSelectPet,
  onAddNewPet,
  onUpdated,
  onOpenSync,
}) => {
  const [name, setName] = useState(pet.name);
  const [avatarEmoji, setAvatarEmoji] = useState(pet.avatarEmoji || '🐱');
  const [insulinName, setInsulinName] = useState(pet.insulinName);
  const [defaultDoseUnits, setDefaultDoseUnits] = useState(pet.defaultDoseUnits.toString());
  const [targetMinMgDl, setTargetMinMgDl] = useState(pet.targetMinMgDl.toString());
  const [targetMaxMgDl, setTargetMaxMgDl] = useState(pet.targetMaxMgDl.toString());
  const [hypoThresholdMgDl, setHypoThresholdMgDl] = useState(pet.hypoThresholdMgDl.toString());
  const [scheduledAmTime, setScheduledAmTime] = useState(pet.scheduledAmTime);
  const [scheduledPmTime, setScheduledPmTime] = useState(pet.scheduledPmTime);
  const [bgUnit, setBgUnit] = useState<BgUnit>(settings.bgUnit);

  useEffect(() => {
    setName(pet.name);
    setAvatarEmoji(pet.avatarEmoji || '🐱');
    setInsulinName(pet.insulinName);
    setDefaultDoseUnits(pet.defaultDoseUnits.toString());
    setTargetMinMgDl(pet.targetMinMgDl.toString());
    setTargetMaxMgDl(pet.targetMaxMgDl.toString());
    setHypoThresholdMgDl(pet.hypoThresholdMgDl.toString());
    setScheduledAmTime(pet.scheduledAmTime);
    setScheduledPmTime(pet.scheduledPmTime);
    setBgUnit(settings.bgUnit);
  }, [pet, settings]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await db.pets.update(pet.id, {
        name: name.trim(),
        avatarEmoji,
        insulinName: insulinName.trim(),
        defaultDoseUnits: parseFloat(defaultDoseUnits) || 1.5,
        targetMinMgDl: parseInt(targetMinMgDl, 10) || 80,
        targetMaxMgDl: parseInt(targetMaxMgDl, 10) || 150,
        hypoThresholdMgDl: parseInt(hypoThresholdMgDl, 10) || 80,
        scheduledAmTime,
        scheduledPmTime,
      });

      await db.settings.update(settings.id, {
        bgUnit,
      });

      triggerDebouncedAutoSync();
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePet = async (petToDelete: Pet) => {
    if (allPets.length <= 1) {
      alert('You must keep at least one pet profile.');
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to delete ${petToDelete.name}'s profile and all associated records?`
      )
    ) {
      await recordTombstone(petToDelete.id, 'pet');

      await db.transaction(
        'rw',
        [db.pets, db.readings, db.doses, db.feedings, db.foodPresets, db.healthNotes, db.settings],
        async () => {
          await db.readings.where('petId').equals(petToDelete.id).delete();
          await db.doses.where('petId').equals(petToDelete.id).delete();
          await db.feedings.where('petId').equals(petToDelete.id).delete();
          await db.foodPresets.where('petId').equals(petToDelete.id).delete();
          await db.healthNotes.where('petId').equals(petToDelete.id).delete();
          await db.pets.delete(petToDelete.id);

          const remainingPets = allPets.filter((p) => p.id !== petToDelete.id);
          if (remainingPets.length > 0) {
            await db.settings.update(settings.id, { activePetId: remainingPets[0].id });
          }
        }
      );

      triggerDebouncedAutoSync();
      onUpdated?.();
    }
  };

  const handleExportCsv = async () => {
    const [readings, doses, feedings, notes] = await Promise.all([
      db.readings.where('petId').equals(pet.id).toArray(),
      db.doses.where('petId').equals(pet.id).toArray(),
      db.feedings.where('petId').equals(pet.id).toArray(),
      db.healthNotes.where('petId').equals(pet.id).toArray(),
    ]);

    const csvData = exportToCsv(pet, readings, doses, feedings, notes, bgUnit);
    downloadFile(csvData, `${pet.name}_Diabetes_Log_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  const handleExportBackup = async () => {
    const jsonData = await exportCompleteBackupJson();
    downloadFile(jsonData, `SugarBaby_Backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = await restoreCompleteBackupJson(content);
        if (success) {
          alert('Backup restored successfully!');
          window.location.reload();
        } else {
          alert('Failed to restore backup file. Invalid format.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetSampleData = async () => {
    if (
      window.confirm(
        'Reset local database to clean initial sample data? This will also disconnect cloud sync so you start completely fresh.'
      )
    ) {
      clearStoredToken();
      setStoredFileId(null);
      await db.delete();
      await db.open();
      await initializeDatabase();
      window.location.reload();
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Settings & Pet Profiles"
      subtitle="Customize targets, manage multiple pets, and unit preferences"
      icon={<Settings className="w-5 h-5 text-indigo-400" />}
    >
      <form onSubmit={handleSaveProfile} className="space-y-5">
        {/* Multi-Pet Profile Selector Bar */}
        {allPets.length > 0 && (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
              <span>Active Pet Profile</span>
              {onAddNewPet && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAddNewPet();
                  }}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3 h-3" /> Add Pet
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {allPets.map((p) => {
                const isActive = p.id === pet.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPet?.(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40'
                        : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>{p.avatarEmoji || '🐱'}</span>
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Glucose Unit Switcher */}
        <div className="bg-slate-800/80 border border-indigo-500/30 rounded-2xl p-3.5 space-y-2">
          <label className="text-xs font-bold text-slate-200">
            Blood Glucose Display Unit
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setBgUnit('mg/dL')}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                bgUnit === 'mg/dL'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white'
              }`}
            >
              mg/dL (US Standard)
            </button>
            <button
              type="button"
              onClick={() => setBgUnit('mmol/L')}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                bgUnit === 'mmol/L'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white'
              }`}
            >
              mmol/L (International)
            </button>
          </div>
        </div>

        {/* Active Pet Configuration Form */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>Editing {pet.name}'s Profile</span>
            </div>

            {allPets.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeletePet(pet)}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Delete Profile
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Pet Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Insulin Name</label>
              <input
                type="text"
                value={insulinName}
                placeholder="e.g. Lantus, ProZinc"
                onChange={(e) => setInsulinName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Default Dose (U)</label>
              <input
                type="number"
                step="0.25"
                value={defaultDoseUnits}
                onChange={(e) => setDefaultDoseUnits(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Hypo Alert (&lt;)</label>
              <input
                type="number"
                value={hypoThresholdMgDl}
                onChange={(e) => setHypoThresholdMgDl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Target Min (mg/dL)</label>
              <input
                type="number"
                value={targetMinMgDl}
                onChange={(e) => setTargetMinMgDl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Target Max (mg/dL)</label>
              <input
                type="number"
                value={targetMaxMgDl}
                onChange={(e) => setTargetMaxMgDl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Target AM Dose Time</label>
              <input
                type="time"
                value={scheduledAmTime}
                onChange={(e) => setScheduledAmTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Target PM Dose Time</label>
              <input
                type="time"
                value={scheduledPmTime}
                onChange={(e) => setScheduledPmTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4" /> Save Profile & Settings
        </button>

        {/* Data Backup & Export Section */}
        <div className="pt-3 border-t border-slate-800 space-y-2.5">
          <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Data Backup & Clinical Export</span>
          </div>

          {onOpenSync && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSync();
              }}
              className="w-full p-3 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/30 hover:border-indigo-500/60 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 group-hover:scale-105 transition-transform">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                    Google Drive Cloud Sync & Sharing
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Sync in real-time across devices & invite family members
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                Configure →
              </span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" /> Export CSV Log
            </button>

            <button
              type="button"
              onClick={handleExportBackup}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" /> JSON Backup
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileRestore}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Restore Backup File
            </button>

            <button
              type="button"
              onClick={handleResetSampleData}
              className="p-2 rounded-xl bg-slate-900 hover:bg-rose-900/30 border border-slate-800 text-slate-500 hover:text-rose-400 transition-colors"
              title="Reset sample data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </ModalSheet>
  );
};

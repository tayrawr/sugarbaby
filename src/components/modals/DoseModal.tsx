import React, { useState, useEffect } from 'react';
import { Syringe, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { differenceInHours, parseISO } from 'date-fns';
import { ModalSheet } from '../common/ModalSheet';
import { TimeDateSelector } from '../common/TimeDateSelector';
import type { Dose, Pet, InjectionSite } from '../../types';
import { db } from '../../db';
import { triggerDebouncedAutoSync } from '../../utils/syncEngine';

interface DoseModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  lastDose?: Dose | null;
  allDoses?: Dose[];
  editingDose?: Dose | null;
  onSaved?: () => void;
}

const INJECTION_SITES: InjectionSite[] = [
  'Left Flank',
  'Right Flank',
  'Scruff',
  'Left Shoulder',
  'Right Shoulder',
  'Other',
];

const PRESET_UNITS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

export const DoseModal: React.FC<DoseModalProps> = ({
  isOpen,
  onClose,
  pet,
  lastDose,
  allDoses = [],
  editingDose,
  onSaved,
}) => {
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString());
  const [units, setUnits] = useState<number>(1.5);
  const [injectionSite, setInjectionSite] = useState<InjectionSite | undefined>('Right Flank');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingDose) {
      setTimestamp(editingDose.timestamp);
      setUnits(editingDose.units);
      setInjectionSite(editingDose.injectionSite);
      setNote(editingDose.note ?? '');
    } else {
      setTimestamp(new Date().toISOString());
      // Auto-fill from last recorded dose or pet default
      const defaultUnits = lastDose?.units ?? pet.defaultDoseUnits ?? 1.5;
      setUnits(defaultUnits);
      // Alternate injection site from last dose if possible
      if (lastDose?.injectionSite === 'Right Flank') {
        setInjectionSite('Left Flank');
      } else if (lastDose?.injectionSite === 'Left Flank') {
        setInjectionSite('Right Flank');
      } else {
        setInjectionSite('Right Flank');
      }
      setNote('');
    }
  }, [editingDose, isOpen, lastDose, pet]);

  // Check if a dose was logged within 8 hours of this timestamp
  const targetDate = parseISO(timestamp);
  const recentDoseConflict = !editingDose
    ? allDoses.find((d) => {
        const dDate = parseISO(d.timestamp);
        const diffHrs = Math.abs(differenceInHours(targetDate, dDate));
        return diffHrs < 8;
      })
    : null;

  const handleStep = (delta: number) => {
    setUnits((prev) => Math.max(0.1, Number((prev + delta).toFixed(2))));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (units <= 0) return;

    setIsSubmitting(true);
    try {
      if (editingDose) {
        await db.doses.update(editingDose.id, {
          timestamp,
          units,
          injectionSite,
          insulinName: pet.insulinName,
          note: note.trim() || undefined,
        });
      } else {
        const newDose: Dose = {
          id: `dose_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          petId: pet.id,
          timestamp,
          units,
          injectionSite,
          insulinName: pet.insulinName,
          note: note.trim() || undefined,
        };
        await db.doses.add(newDose);
      }

      triggerDebouncedAutoSync();
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving dose:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingDose ? 'Edit Insulin Dose' : 'Log Insulin Dose'}
      subtitle={`${pet.insulinName || 'Insulin'} for ${pet.name}`}
      icon={<Syringe className="w-5 h-5 text-indigo-400" />}
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Time and Date Bar */}
        <TimeDateSelector value={timestamp} onChange={setTimestamp} />

        {/* Safety Warning Banner if recent dose exists within 8 hours */}
        {recentDoseConflict && (
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-3 flex items-start gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <span className="font-bold">Recent dose detected:</span> A dose of{' '}
              <span className="font-bold text-white">{recentDoseConflict.units} U</span> was already logged{' '}
              {Math.abs(differenceInHours(targetDate, parseISO(recentDoseConflict.timestamp)))} hours ago. Please double-check to prevent accidental double-dosing.
            </div>
          </div>
        )}

        {/* Units Entry Display & Steppers */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center space-y-3">
          <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Quantity (Units)</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleStep(-0.25)}
              className="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-lg font-bold text-slate-200 transition-all flex items-center justify-center"
            >
              -¼
            </button>

            <div className="min-w-32 px-4 py-2 bg-slate-900/90 border border-indigo-500/30 rounded-2xl">
              <span className="text-4xl font-black text-white tracking-tight">
                {units.toFixed(2).replace(/\.00$/, '')}
              </span>
              <span className="text-sm font-bold text-indigo-400 ml-1.5">U</span>
            </div>

            <button
              type="button"
              onClick={() => handleStep(0.25)}
              className="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-lg font-bold text-slate-200 transition-all flex items-center justify-center"
            >
              +¼
            </button>
          </div>

          {/* Quick Increment Row & Preset Dose Buttons */}
          <div className="flex items-center justify-center gap-1.5 pt-1 overflow-x-auto scrollbar-none">
            {PRESET_UNITS.map((p) => {
              const isSelected = Math.abs(units - p) < 0.01;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setUnits(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p} U
                </button>
              );
            })}
          </div>
        </div>

        {/* Injection Site Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Injection Site (Site Rotation)
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {INJECTION_SITES.map((site) => {
              const isSelected = injectionSite === site;
              return (
                <button
                  key={site}
                  type="button"
                  onClick={() => setInjectionSite(site)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all text-center truncate ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {site}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Note */}
        <div>
          <input
            type="text"
            placeholder="Add note (e.g. fur wet check, calm injection)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Submit Action */}
        <button
          type="submit"
          disabled={units <= 0 || isSubmitting}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-98 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>{editingDose ? 'Update Dose' : 'Confirm & Log Dose'}</span>
        </button>
      </form>
    </ModalSheet>
  );
};

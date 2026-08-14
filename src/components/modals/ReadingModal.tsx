import React, { useState, useEffect } from 'react';
import { Activity, Check } from 'lucide-react';
import { ModalSheet } from '../common/ModalSheet';
import { TimeDateSelector } from '../common/TimeDateSelector';
import { GlucoseNumpad } from '../common/GlucoseNumpad';
import { getBgStatus, mmolLToMgDl, mgDlToMmolL } from '../../utils/units';
import type { Reading, Pet, BgUnit } from '../../types';
import { db } from '../../db';

interface ReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  bgUnit: BgUnit;
  editingReading?: Reading | null;
  onSaved?: () => void;
}

const CYCLE_TAG_SUGGESTIONS = ['AMPS', 'PMPS', '+1', '+2', '+3', '+4', '+5', '+6', '+7', '+8', '+9', '+10', '+11'];

export const ReadingModal: React.FC<ReadingModalProps> = ({
  isOpen,
  onClose,
  pet,
  bgUnit,
  editingReading,
  onSaved,
}) => {
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString());
  const [rawInputValue, setRawInputValue] = useState<string>('');
  const [cycleTag, setCycleTag] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingReading) {
      setTimestamp(editingReading.timestamp);
      if (bgUnit === 'mmol/L') {
        setRawInputValue(mgDlToMmolL(editingReading.valueMgDl).toString());
      } else {
        setRawInputValue(editingReading.valueMgDl.toString());
      }
      setCycleTag(editingReading.cycleTag ?? '');
      setNote(editingReading.note ?? '');
    } else {
      setTimestamp(new Date().toISOString());
      setRawInputValue('');
      setCycleTag('');
      setNote('');
    }
  }, [editingReading, isOpen, bgUnit]);

  // Calculate current numerical value in mg/dL for live badge feedback
  const numericVal = parseFloat(rawInputValue);
  const currentMgDl = !isNaN(numericVal) && numericVal > 0
    ? bgUnit === 'mmol/L'
      ? mmolLToMgDl(numericVal)
      : numericVal
    : null;

  const statusInfo = currentMgDl ? getBgStatus(currentMgDl, pet) : null;

  const handleNudge = (delta: number) => {
    const curr = parseFloat(rawInputValue) || (bgUnit === 'mmol/L' ? 8.0 : 150);
    const updated = Math.max(1, curr + (bgUnit === 'mmol/L' ? delta / 10 : delta));
    setRawInputValue(bgUnit === 'mmol/L' ? updated.toFixed(1) : Math.round(updated).toString());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMgDl || currentMgDl <= 0) return;

    setIsSubmitting(true);
    try {
      if (editingReading) {
        await db.readings.update(editingReading.id, {
          timestamp,
          valueMgDl: currentMgDl,
          cycleTag: cycleTag.trim() || undefined,
          note: note.trim() || undefined,
        });
      } else {
        const newReading: Reading = {
          id: `reading_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          petId: pet.id,
          timestamp,
          valueMgDl: currentMgDl,
          cycleTag: cycleTag.trim() || undefined,
          note: note.trim() || undefined,
        };
        await db.readings.add(newReading);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving reading:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingReading ? 'Edit Blood Glucose Reading' : 'Log Blood Glucose Reading'}
      subtitle={`Tracking for ${pet.name}`}
      icon={<Activity className="w-5 h-5 text-rose-400" />}
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Time and Date Bar */}
        <TimeDateSelector value={timestamp} onChange={setTimestamp} />

        {/* Large Value Display Box */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center space-y-2">
          <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Blood Glucose ({bgUnit})
          </div>

          <div className="h-16 flex items-center justify-center">
            {rawInputValue ? (
              <span className="text-5xl font-black text-white tracking-tight">
                {rawInputValue}
              </span>
            ) : (
              <span className="text-4xl font-bold text-slate-600">
                000
              </span>
            )}
          </div>

          {/* Dynamic Status Pill */}
          <div className="min-h-7 flex items-center justify-center">
            {statusInfo ? (
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeClass} animate-fadeIn`}
              >
                ● {statusInfo.label} (Target: {pet.targetMinMgDl}–{pet.targetMaxMgDl} mg/dL)
              </span>
            ) : (
              <span className="text-xs text-slate-500">
                Enter reading to check target zone
              </span>
            )}
          </div>
        </div>

        {/* Interactive Numpad */}
        <GlucoseNumpad
          value={rawInputValue}
          onChange={setRawInputValue}
          onNudge={handleNudge}
          allowDecimal={bgUnit === 'mmol/L'}
        />

        {/* Cycle Tag Shortcuts */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">
            Cycle Timing (Optional)
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CYCLE_TAG_SUGGESTIONS.map((tag) => {
              const isSelected = cycleTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCycleTag(isSelected ? '' : tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/40'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Note */}
        <div>
          <input
            type="text"
            placeholder="Add note (e.g. before meal, ear prick, stressed)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        {/* Submit Action */}
        <button
          type="submit"
          disabled={!currentMgDl || isSubmitting}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 active:scale-98 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>{editingReading ? 'Update Reading' : 'Save Reading'}</span>
        </button>
      </form>
    </ModalSheet>
  );
};

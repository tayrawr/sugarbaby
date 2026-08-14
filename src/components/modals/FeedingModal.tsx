import React, { useState, useEffect } from 'react';
import { Utensils, Check, Sparkles } from 'lucide-react';
import { ModalSheet } from '../common/ModalSheet';
import { TimeDateSelector } from '../common/TimeDateSelector';
import { AppetiteSlider } from '../common/AppetiteSlider';
import type { Feeding, FoodPreset, Pet } from '../../types';
import { db } from '../../db';
import { triggerDebouncedAutoSync } from '../../utils/syncEngine';

interface FeedingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  presets: FoodPreset[];
  editingFeeding?: Feeding | null;
  onSaved?: () => void;
}

export const FeedingModal: React.FC<FeedingModalProps> = ({
  isOpen,
  onClose,
  pet,
  presets,
  editingFeeding,
  onSaved,
}) => {
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString());
  const [foodName, setFoodName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>();
  const [appetitePercent, setAppetitePercent] = useState<number>(100);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingFeeding) {
      setTimestamp(editingFeeding.timestamp);
      setFoodName(editingFeeding.foodName);
      setAmount(editingFeeding.amount);
      setSelectedPresetId(editingFeeding.foodPresetId);
      setAppetitePercent(editingFeeding.appetitePercent);
      setNote(editingFeeding.note ?? '');
    } else {
      setTimestamp(new Date().toISOString());
      if (presets.length > 0) {
        const first = presets[0];
        setFoodName(first.name);
        setAmount(first.amount);
        setSelectedPresetId(first.id);
      } else {
        setFoodName('');
        setAmount('');
        setSelectedPresetId(undefined);
      }
      setAppetitePercent(100);
      setNote('');
    }
  }, [editingFeeding, isOpen, presets]);

  const handleSelectPreset = (preset: FoodPreset) => {
    setSelectedPresetId(preset.id);
    setFoodName(preset.name);
    setAmount(preset.amount);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim() || !amount.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingFeeding) {
        await db.feedings.update(editingFeeding.id, {
          timestamp,
          foodName: foodName.trim(),
          amount: amount.trim(),
          foodPresetId: selectedPresetId,
          appetitePercent,
          note: note.trim() || undefined,
        });
      } else {
        const newFeeding: Feeding = {
          id: `feed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          petId: pet.id,
          timestamp,
          foodName: foodName.trim(),
          amount: amount.trim(),
          foodPresetId: selectedPresetId,
          appetitePercent,
          note: note.trim() || undefined,
        };
        await db.feedings.add(newFeeding);
      }

      triggerDebouncedAutoSync();
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving feeding:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingFeeding ? 'Edit Feeding' : 'Log Feeding'}
      subtitle={`Meal or snack for ${pet.name}`}
      icon={<Utensils className="w-5 h-5 text-amber-400" />}
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Time and Date Bar */}
        <TimeDateSelector value={timestamp} onChange={setTimestamp} />

        {/* Preset Food Chips */}
        {presets.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Choose Preset Food
              </span>
              <span className="text-[11px] text-slate-500">1-tap autofill</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/60 shadow-sm shadow-amber-500/20 text-amber-200'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold leading-snug line-clamp-1">
                      {preset.name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Portion: {preset.amount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom / Editable Name & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-slate-300">Food Item</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Elseys Chicken Kibble"
              value={foodName}
              onChange={(e) => {
                setFoodName(e.target.value);
                setSelectedPresetId(undefined);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Portion</label>
            <input
              type="text"
              required
              placeholder="e.g. 1 tbsp, 1/2 can"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setSelectedPresetId(undefined);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Visual Appetite Slider */}
        <AppetiteSlider value={appetitePercent} onChange={setAppetitePercent} />

        {/* Optional Note */}
        <div>
          <input
            type="text"
            placeholder="Add note (e.g. ate enthusiastically, gave warm water)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Submit Action */}
        <button
          type="submit"
          disabled={!foodName.trim() || !amount.trim() || isSubmitting}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-98 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>{editingFeeding ? 'Update Feeding' : 'Save Feeding'}</span>
        </button>
      </form>
    </ModalSheet>
  );
};

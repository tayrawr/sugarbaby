import React, { useState } from 'react';
import { Heart, Plus } from 'lucide-react';
import { ModalSheet } from '../common/ModalSheet';
import { db } from '../../db';
import type { Pet, FoodPreset } from '../../types';
import { triggerDebouncedAutoSync } from '../../utils/syncEngine';

interface AddPetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPetAdded: (petId: string) => void;
}

const EMOJI_OPTIONS = ['🐱', '🐈', '🐈‍⬛', '🦁', '🐾', '🐯', '🤍', '🖤', '🧡', '🩶'];

export const AddPetModal: React.FC<AddPetModalProps> = ({ isOpen, onClose, onPetAdded }) => {
  const [name, setName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🐱');
  const [insulinName, setInsulinName] = useState('Lantus (Glargine)');
  const [defaultDoseUnits, setDefaultDoseUnits] = useState('1.5');
  const [scheduledAmTime, setScheduledAmTime] = useState('08:00');
  const [scheduledPmTime, setScheduledPmTime] = useState('20:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const newPetId = `pet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newPet: Pet = {
        id: newPetId,
        name: name.trim(),
        avatarEmoji,
        insulinName: insulinName.trim() || 'Insulin',
        defaultDoseUnits: parseFloat(defaultDoseUnits) || 1.5,
        targetMinMgDl: 80,
        targetMaxMgDl: 150,
        hypoThresholdMgDl: 80,
        highThresholdMgDl: 250,
        scheduledAmTime,
        scheduledPmTime,
        createdAt: new Date().toISOString(),
      };

      // Add starter food preset for new pet
      const starterPreset: FoodPreset = {
        id: `preset_${Date.now()}_1`,
        petId: newPetId,
        name: "Dr. Elsey's cleanprotein Chicken Kibble",
        amount: '1 tbsp',
        orderIndex: 0,
      };

      await db.pets.add(newPet);
      await db.foodPresets.add(starterPreset);

      // Set as active pet in settings
      const settings = await db.settings.toCollection().first();
      if (settings) {
        await db.settings.update(settings.id, { activePetId: newPetId });
      }

      triggerDebouncedAutoSync();
      onPetAdded(newPetId);
      onClose();
      // Reset fields
      setName('');
      setAvatarEmoji('🐱');
    } catch (err) {
      console.error('Error creating pet:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Pet Profile"
      subtitle="Track diabetes for another cat in your household"
      icon={<Heart className="w-5 h-5 text-rose-400" />}
    >
      <form onSubmit={handleCreatePet} className="space-y-4">
        {/* Emoji Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Choose Avatar Emoji</label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setAvatarEmoji(emoji)}
                className={`w-10 h-10 rounded-2xl text-xl flex items-center justify-center transition-all ${
                  avatarEmoji === emoji
                    ? 'bg-indigo-600 border-2 border-indigo-400 scale-105 shadow-md shadow-indigo-600/40'
                    : 'bg-slate-800 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Pet Name & Insulin Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Pet Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Luna, Oliver"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Insulin Name / Brand</label>
            <input
              type="text"
              placeholder="e.g. Lantus, ProZinc, Vetsulin"
              value={insulinName}
              onChange={(e) => setInsulinName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Default Dose Units */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Default Dose (Units)</label>
          <input
            type="number"
            step="0.25"
            value={defaultDoseUnits}
            onChange={(e) => setDefaultDoseUnits(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Scheduled Dose Times */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Scheduled AM Shot</label>
            <input
              type="time"
              value={scheduledAmTime}
              onChange={(e) => setScheduledAmTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Scheduled PM Shot</label>
            <input
              type="time"
              value={scheduledPmTime}
              onChange={(e) => setScheduledPmTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!name.trim() || isSubmitting}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-98 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Pet Profile</span>
        </button>
      </form>
    </ModalSheet>
  );
};

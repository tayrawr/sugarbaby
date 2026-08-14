import React, { useState } from 'react';
import { Sparkles, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { ModalSheet } from '../common/ModalSheet';
import type { FoodPreset, Pet } from '../../types';
import { db, recordTombstone } from '../../db';
import { triggerDebouncedAutoSync } from '../../utils/syncEngine';

interface FoodPresetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  presets: FoodPreset[];
  onUpdated?: () => void;
}

export const FoodPresetManagerModal: React.FC<FoodPresetManagerModalProps> = ({
  isOpen,
  onClose,
  pet,
  presets,
  onUpdated,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  const startEdit = (preset: FoodPreset) => {
    setEditingId(preset.id);
    setNameInput(preset.name);
    setAmountInput(preset.amount);
    setIsAddingNew(false);
  };

  const startAdd = () => {
    setEditingId(null);
    setNameInput('');
    setAmountInput('');
    setIsAddingNew(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setNameInput('');
    setAmountInput('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !amountInput.trim()) return;

    if (isAddingNew) {
      const newPreset: FoodPreset = {
        id: `preset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        petId: pet.id,
        name: nameInput.trim(),
        amount: amountInput.trim(),
        orderIndex: presets.length,
      };
      await db.foodPresets.add(newPreset);
    } else if (editingId) {
      await db.foodPresets.update(editingId, {
        name: nameInput.trim(),
        amount: amountInput.trim(),
      });
    }

    triggerDebouncedAutoSync();
    cancelEdit();
    onUpdated?.();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this food preset?')) {
      await recordTombstone(id, 'foodPreset');
      await db.foodPresets.delete(id);
      triggerDebouncedAutoSync();
      if (editingId === id) cancelEdit();
      onUpdated?.();
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Food Presets Manager"
      subtitle={`Saved go-to meals and portions for ${pet.name}`}
      icon={<Sparkles className="w-5 h-5 text-amber-400" />}
    >
      <div className="space-y-4">
        {/* Preset List */}
        <div className="space-y-2">
          {presets.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              No food presets saved yet. Add one below!
            </div>
          ) : (
            presets.map((preset) => {
              const isCurrentlyEditing = editingId === preset.id;
              if (isCurrentlyEditing) return null;

              return (
                <div
                  key={preset.id}
                  className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-200 truncate">
                      {preset.name}
                    </h4>
                    <p className="text-[11px] text-amber-400 font-semibold mt-0.5">
                      Portion: {preset.amount}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(preset)}
                      className="p-1.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Edit preset"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(preset.id)}
                      className="p-1.5 rounded-xl bg-slate-700/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add or Edit Form */}
        {(isAddingNew || editingId) ? (
          <form onSubmit={handleSave} className="bg-slate-950/70 border border-amber-500/40 rounded-2xl p-3.5 space-y-3 animate-fadeIn">
            <h4 className="text-xs font-bold text-amber-300">
              {isAddingNew ? 'Create New Food Preset' : 'Edit Food Preset'}
            </h4>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Food Name / Brand</label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Elseys cleanprotein chicken"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Portion Amount & Unit</label>
              <input
                type="text"
                required
                placeholder="e.g. 1 tbsp, 1/2 can, 1/4 cup, 25g"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-xs text-slate-950 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Save Preset
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-medium text-xs text-slate-300 flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={startAdd}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 text-slate-300 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add New Preset Food</span>
          </button>
        )}
      </div>
    </ModalSheet>
  );
};

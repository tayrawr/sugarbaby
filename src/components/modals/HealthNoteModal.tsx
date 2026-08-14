import React, { useState, useEffect } from 'react';
import { FileText, Check, Plus, Tag } from 'lucide-react';
import { ModalSheet } from '../common/ModalSheet';
import { TimeDateSelector } from '../common/TimeDateSelector';
import type { HealthNote, Pet } from '../../types';
import { db } from '../../db';

interface HealthNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  editingNote?: HealthNote | null;
  onSaved?: () => void;
}

const COMMON_SYMPTOM_TAGS = [
  { label: 'High Thirst', emoji: '💧' },
  { label: 'Extra Urination', emoji: '🚽' },
  { label: 'Lethargic', emoji: '😴' },
  { label: 'Playful & Alert', emoji: '😺' },
  { label: 'Vomited', emoji: '🤢' },
  { label: 'Wobbly Gait', emoji: '🐾' },
  { label: 'Weight Entry', emoji: '⚖️' },
  { label: 'Vet Visit', emoji: '🩺' },
];

export const HealthNoteModal: React.FC<HealthNoteModalProps> = ({
  isOpen,
  onClose,
  pet,
  editingNote,
  onSaved,
}) => {
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString());
  const [content, setContent] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [weightValue, setWeightValue] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingNote) {
      setTimestamp(editingNote.timestamp);
      setContent(editingNote.content);
      setSelectedTags(editingNote.tags ?? []);
      setWeightValue(editingNote.weightValue ? editingNote.weightValue.toString() : '');
      setWeightUnit(editingNote.weightUnit ?? 'lbs');
    } else {
      setTimestamp(new Date().toISOString());
      setContent('');
      setSelectedTags([]);
      setWeightValue('');
      setWeightUnit('lbs');
    }
  }, [editingNote, isOpen]);

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTagInput.trim()) return;
    const tag = customTagInput.trim();
    if (!selectedTags.includes(tag)) {
      setSelectedTags((prev) => [...prev, tag]);
    }
    setCustomTagInput('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && selectedTags.length === 0 && !weightValue) return;

    setIsSubmitting(true);
    try {
      const parsedWeight = parseFloat(weightValue);

      if (editingNote) {
        await db.healthNotes.update(editingNote.id, {
          timestamp,
          content: content.trim(),
          tags: selectedTags,
          weightValue: !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : undefined,
          weightUnit: !isNaN(parsedWeight) && parsedWeight > 0 ? weightUnit : undefined,
        });
      } else {
        const newNote: HealthNote = {
          id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          petId: pet.id,
          timestamp,
          content: content.trim(),
          tags: selectedTags,
          weightValue: !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : undefined,
          weightUnit: !isNaN(parsedWeight) && parsedWeight > 0 ? weightUnit : undefined,
        };
        await db.healthNotes.add(newNote);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving health note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isWeightSelected = selectedTags.includes('Weight Entry');

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingNote ? 'Edit Health Note' : 'Log Health Note'}
      subtitle={`Behavior & observations for ${pet.name}`}
      icon={<FileText className="w-5 h-5 text-teal-400" />}
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Time and Date Bar */}
        <TimeDateSelector value={timestamp} onChange={setTimestamp} />

        {/* Quick Symptom / Observation Tag Chips */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-teal-400" />
            <span>Quick Observation Tags (1-Tap)</span>
          </label>

          <div className="flex flex-wrap gap-1.5">
            {COMMON_SYMPTOM_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag.label);
              return (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => toggleTag(tag.label)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-teal-500 text-white shadow-sm shadow-teal-500/30 scale-102'
                      : 'bg-slate-800 border border-slate-700/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{tag.emoji}</span>
                  <span>{tag.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Weight input appears if weight tag active */}
        {isWeightSelected && (
          <div className="bg-slate-800/80 border border-teal-500/40 rounded-2xl p-3 space-y-2 animate-fadeIn">
            <label className="text-xs font-semibold text-teal-300">
              ⚖️ Body Weight Recording
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 11.2"
                value={weightValue}
                onChange={(e) => setWeightValue(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
              />
              <div className="flex rounded-xl bg-slate-900 border border-slate-700 p-0.5">
                <button
                  type="button"
                  onClick={() => setWeightUnit('lbs')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    weightUnit === 'lbs' ? 'bg-teal-600 text-white' : 'text-slate-400'
                  }`}
                >
                  lbs
                </button>
                <button
                  type="button"
                  onClick={() => setWeightUnit('kg')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    weightUnit === 'kg' ? 'bg-teal-600 text-white' : 'text-slate-400'
                  }`}
                >
                  kg
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Freeform Text Content Area */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">
            Observation / Clinical Note
          </label>
          <textarea
            rows={3}
            placeholder="Describe behavior, energy level, appetite details, litter habits, or vet advice..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none leading-relaxed"
          />
        </div>

        {/* Add custom tag */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add custom tag..."
            value={customTagInput}
            onChange={(e) => setCustomTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomTag(e);
              }
            }}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-teal-500"
          />
          <button
            type="button"
            onClick={handleAddCustomTag}
            disabled={!customTagInput.trim()}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Tag
          </button>
        </div>

        {/* Submit Action */}
        <button
          type="submit"
          disabled={(!content.trim() && selectedTags.length === 0 && !weightValue) || isSubmitting}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 active:scale-98 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>{editingNote ? 'Update Note' : 'Save Health Note'}</span>
        </button>
      </form>
    </ModalSheet>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';
import type { Pet } from '../../types';

interface PetSwitcherProps {
  pets: Pet[];
  activePet: Pet;
  onSelectPet: (petId: string) => void;
  onAddNewPet: () => void;
}

export const PetSwitcher: React.FC<PetSwitcherProps> = ({
  pets,
  activePet,
  onSelectPet,
  onAddNewPet,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-indigo-300 transition-all text-xs font-bold shadow-sm"
      >
        <span>{activePet.avatarEmoji || '🐱'}</span>
        <span>{activePet.name}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl z-50 py-1.5 animate-scaleUp">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            Switch Pet Profile
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {pets.map((p) => {
              const isSelected = p.id === activePet.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelectPet(p.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{p.avatarEmoji || '🐱'}</span>
                    <span className="truncate">{p.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="pt-1 border-t border-slate-800 px-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAddNewPet();
              }}
              className="w-full px-2.5 py-1.5 text-left flex items-center gap-2 text-xs font-bold text-indigo-400 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Pet Profile</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

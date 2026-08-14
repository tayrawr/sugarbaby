import React from 'react';
import { Activity, Syringe, Utensils, FileText } from 'lucide-react';

interface BottomDockProps {
  onOpenReading: () => void;
  onOpenDose: () => void;
  onOpenFeeding: () => void;
  onOpenNote: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  onOpenReading,
  onOpenDose,
  onOpenFeeding,
  onOpenNote,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/85 backdrop-blur-xl border-t border-slate-800/80 px-3 sm:px-6 py-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
      <div className="max-w-xl mx-auto grid grid-cols-4 gap-2">
        {/* + Reading */}
        <button
          type="button"
          onClick={onOpenReading}
          className="py-2 sm:py-2.5 px-1 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/35 active:scale-95 border border-rose-500/30 text-rose-300 transition-all flex flex-col items-center justify-center gap-1 shadow-sm"
        >
          <Activity className="w-5 h-5 text-rose-400" />
          <span className="text-[11px] sm:text-xs font-bold leading-none">+ Reading</span>
        </button>

        {/* + Dose */}
        <button
          type="button"
          onClick={onOpenDose}
          className="py-2 sm:py-2.5 px-1 rounded-2xl bg-indigo-500/15 hover:bg-indigo-500/25 active:bg-indigo-500/35 active:scale-95 border border-indigo-500/30 text-indigo-300 transition-all flex flex-col items-center justify-center gap-1 shadow-sm"
        >
          <Syringe className="w-5 h-5 text-indigo-400" />
          <span className="text-[11px] sm:text-xs font-bold leading-none">+ Dose</span>
        </button>

        {/* + Feeding */}
        <button
          type="button"
          onClick={onOpenFeeding}
          className="py-2 sm:py-2.5 px-1 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 active:scale-95 border border-amber-500/30 text-amber-300 transition-all flex flex-col items-center justify-center gap-1 shadow-sm"
        >
          <Utensils className="w-5 h-5 text-amber-400" />
          <span className="text-[11px] sm:text-xs font-bold leading-none">+ Food</span>
        </button>

        {/* + Note */}
        <button
          type="button"
          onClick={onOpenNote}
          className="py-2 sm:py-2.5 px-1 rounded-2xl bg-teal-500/15 hover:bg-teal-500/25 active:bg-teal-500/35 active:scale-95 border border-teal-500/30 text-teal-300 transition-all flex flex-col items-center justify-center gap-1 shadow-sm"
        >
          <FileText className="w-5 h-5 text-teal-400" />
          <span className="text-[11px] sm:text-xs font-bold leading-none">+ Note</span>
        </button>
      </div>
    </div>
  );
};

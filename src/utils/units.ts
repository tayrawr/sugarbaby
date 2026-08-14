import type { BgUnit, Pet } from '../types';

export const MGDL_TO_MMOLL_DIVISOR = 18.0182;

/**
 * Converts mg/dL to mmol/L with 1 decimal place precision.
 */
export function mgDlToMmolL(mgDl: number): number {
  return Number((mgDl / MGDL_TO_MMOLL_DIVISOR).toFixed(1));
}

/**
 * Converts mmol/L to mg/dL (rounded integer).
 */
export function mmolLToMgDl(mmolL: number): number {
  return Math.round(mmolL * MGDL_TO_MMOLL_DIVISOR);
}

/**
 * Formats a blood glucose reading value based on the selected display unit.
 */
export function formatBgValue(valueMgDl: number, unit: BgUnit): string {
  if (unit === 'mmol/L') {
    return mgDlToMmolL(valueMgDl).toFixed(1);
  }
  return Math.round(valueMgDl).toString();
}

export type BgStatusCategory = 'hypo' | 'target' | 'elevated' | 'high';

export interface BgStatusInfo {
  category: BgStatusCategory;
  label: string;
  badgeClass: string;
  glowClass: string;
  colorHex: string;
  textColorClass: string;
}

/**
 * Evaluates the clinical glycemic status of a blood glucose reading.
 */
export function getBgStatus(valueMgDl: number, pet?: Pet | null): BgStatusInfo {
  const hypo = pet?.hypoThresholdMgDl ?? 80;
  const targetMax = pet?.targetMaxMgDl ?? 150;
  const high = pet?.highThresholdMgDl ?? 250;

  if (valueMgDl < hypo) {
    return {
      category: 'hypo',
      label: 'Low / Hypo Alert',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      glowClass: 'ring-2 ring-rose-500 shadow-rose-500/30',
      colorHex: '#f43f5e',
      textColorClass: 'text-rose-400',
    };
  }

  if (valueMgDl <= targetMax) {
    return {
      category: 'target',
      label: 'In Target Range',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      glowClass: 'ring-2 ring-emerald-500 shadow-emerald-500/30',
      colorHex: '#10b981',
      textColorClass: 'text-emerald-400',
    };
  }

  if (valueMgDl <= high) {
    return {
      category: 'elevated',
      label: 'Elevated',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      glowClass: 'ring-2 ring-amber-500 shadow-amber-500/30',
      colorHex: '#f59e0b',
      textColorClass: 'text-amber-400',
    };
  }

  return {
    category: 'high',
    label: 'High Glucose',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    glowClass: 'ring-2 ring-orange-500 shadow-orange-500/30',
    colorHex: '#f97316',
    textColorClass: 'text-orange-400',
  };
}

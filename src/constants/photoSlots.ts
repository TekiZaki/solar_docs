// ---
// Summary:
// - Purpose: Pre-defined catalog of all 103 on-site maintenance photo slots
// - Role: Constant metadata dictionary
// - Depends on: src/types/schema.ts, ./photoSlots.json
// - Key Responsibilities: Provide exact media path mapping, default captions, and dates matching REPORT_MT PLTS JKT_SMPN_72.docx
// - Notes: Generates initial photo state for ReportContext
// ---

import type { PhotoSlot } from '../types/schema';
import slotsJson from './photoSlots.json';

export interface PhotoSlotMeta {
  id: string;
  section: string;
  phaseKey: 'general' | 'physical' | 'pre_measure' | 'cleaning' | 'post_measure';
  mediaTarget: string;
  rId: string;
  // True for default slots with no template backing (own media/rels, export regrouped)
  isCustom?: boolean;
  defaultCaption: string;
  defaultDate: string;
}

export const PHOTO_SLOTS_CATALOG: PhotoSlotMeta[] = slotsJson as PhotoSlotMeta[];

export function createInitialPhotoSlots(): Record<string, PhotoSlot> {
  const map: Record<string, PhotoSlot> = {};
  for (const meta of PHOTO_SLOTS_CATALOG) {
    map[meta.id] = {
      ...meta,
      caption: meta.defaultCaption,
      date: meta.defaultDate,
      imageDataUrl: undefined,
      isUploaded: false,
      isCustom: meta.isCustom,
    };
  }
  return map;
}

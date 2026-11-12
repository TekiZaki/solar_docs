// ---
// Summary:
// - Purpose: Pure helper functions for custom photo slot creation and ordered map insertion
// - Role: Domain operation helpers
// - Depends on: src/types/schema.ts
// - Key Responsibilities: Construct custom PhotoSlot records and re-order the slots dictionary
// - Notes: Isolated to keep ReportContext line counts low and cyclomatic complexity minimal
// ---

import type { PhotoSlot, RealizationDate } from '../types/schema';

const SECTION_TITLES: Record<string, string> = {
  general: 'I. INFORMASI UMUM',
  physical: 'II.I. PENGECEKAN KONDISI INSTALASI',
  pre_measure: 'II.II. PENGUKURAN PRA PEMBERSIHAN',
  cleaning: 'II.III. PEMBERSIHAN',
  post_measure: 'II.IV. PENGUKURAN PASCA PEMBERSIHAN',
};

const DEFAULT_CAPTIONS: Record<string, string> = {
  general: 'Foto Bangunan Gedung (Lokasi Pekerjaan)',
  physical: 'Foto Dokumentasi Kondisi Instalasi',
  pre_measure: 'Foto Dokumentasi Pengukuran Pra Pembersihan',
  cleaning: 'Foto Dokumentasi Pembersihan Panel Surya',
  post_measure: 'Foto Dokumentasi Pengukuran Pasca Pembersihan',
};

export function createNewCustomSlot(
  phaseKey: PhotoSlot['phaseKey'],
  dates: RealizationDate[],
  caption?: string
): PhotoSlot {
  const newId = `slot_custom_${Date.now()}`;
  const defaultDates: Record<string, string> = {
    general: 'Sabtu, 05 September 2026',
    physical: dates[0]?.tanggalPelaksanaan || 'Sabtu, 05 September 2026',
    pre_measure: dates[0]?.tanggalPelaksanaan || 'Sabtu, 05 September 2026',
    cleaning: dates[1]?.tanggalPelaksanaan || 'Sabtu, 05 September 2026',
    post_measure: dates[2]?.tanggalPelaksanaan || 'Minggu, 06 September 2026',
  };

  const finalCaption = caption || DEFAULT_CAPTIONS[phaseKey] || 'Foto Dokumentasi Tambahan';
  const shortTs = Date.now().toString().slice(-6);

  return {
    id: newId,
    section: SECTION_TITLES[phaseKey] || 'DOKUMENTASI TAMBAHAN',
    phaseKey,
    mediaTarget: `media/custom_${shortTs}.jpg`,
    rId: `rId_${newId}`,
    defaultCaption: finalCaption,
    defaultDate: defaultDates[phaseKey],
    caption: finalCaption,
    date: defaultDates[phaseKey],
    isUploaded: false,
    isCustom: true,
  };
}

export function insertSlotInMap(
  slots: Record<string, PhotoSlot>,
  newSlot: PhotoSlot,
  insertAfterSlotId?: string | 'START'
): Record<string, PhotoSlot> {
  const entries = Object.entries(slots);
  const nextSlots: Record<string, PhotoSlot> = {};

  if (insertAfterSlotId === 'START') {
    let inserted = false;
    for (const [id, slot] of entries) {
      if (!inserted && slot.phaseKey === newSlot.phaseKey) {
        nextSlots[newSlot.id] = newSlot;
        inserted = true;
      }
      nextSlots[id] = slot;
    }
    if (!inserted) {
      nextSlots[newSlot.id] = newSlot;
    }
    return nextSlots;
  }

  if (insertAfterSlotId) {
    let inserted = false;
    for (const [id, slot] of entries) {
      nextSlots[id] = slot;
      if (id === insertAfterSlotId) {
        nextSlots[newSlot.id] = newSlot;
        inserted = true;
      }
    }
    if (!inserted) {
      nextSlots[newSlot.id] = newSlot;
    }
    return nextSlots;
  }

  let lastIndexOfPhase = -1;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i][1].phaseKey === newSlot.phaseKey) {
      lastIndexOfPhase = i;
    }
  }

  if (lastIndexOfPhase === -1 || lastIndexOfPhase === entries.length - 1) {
    return { ...slots, [newSlot.id]: newSlot };
  }

  for (let i = 0; i < entries.length; i++) {
    const [id, slot] = entries[i];
    nextSlots[id] = slot;
    if (i === lastIndexOfPhase) {
      nextSlots[newSlot.id] = newSlot;
    }
  }
  return nextSlots;
}

export function moveSlotInMap(
  slots: Record<string, PhotoSlot>,
  slotId: string,
  direction: 'prev' | 'next'
): Record<string, PhotoSlot> {
  const targetSlot = slots[slotId];
  if (!targetSlot) return slots;

  const entries = Object.entries(slots);
  const phaseEntries = entries.filter(([, s]) => s.phaseKey === targetSlot.phaseKey);
  const phaseIdx = phaseEntries.findIndex(([id]) => id === slotId);

  if (phaseIdx === -1) return slots;
  const targetPhaseIdx = direction === 'prev' ? phaseIdx - 1 : phaseIdx + 1;
  if (targetPhaseIdx < 0 || targetPhaseIdx >= phaseEntries.length) return slots;

  const swapWithId = phaseEntries[targetPhaseIdx][0];
  const oldGlobalIdx = entries.findIndex(([id]) => id === slotId);
  const newGlobalIdx = entries.findIndex(([id]) => id === swapWithId);

  if (oldGlobalIdx === -1 || newGlobalIdx === -1) return slots;

  const newEntries = [...entries];
  const [removed] = newEntries.splice(oldGlobalIdx, 1);
  newEntries.splice(newGlobalIdx, 0, removed);

  const nextSlots: Record<string, PhotoSlot> = {};
  for (const [id, s] of newEntries) {
    nextSlots[id] = s;
  }
  return nextSlots;
}

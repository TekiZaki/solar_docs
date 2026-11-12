// ---
// Summary:
// - Purpose: Inspect maintenance report state for unuploaded photos and empty data fields, and generate group chat text
// - Role: Domain utility / Data synthesis
// - Depends on: src/types/schema.ts
// - Key Responsibilities: Identify missing documentation items and format concise, structured summary text for WhatsApp/Telegram
// - Notes: Satisfies field team communication and checklist verification
// ---

import type { MaintenanceReportState, PhotoSlot } from '../types/schema';
import { NON_EDITABLE_CHECKLIST_IDS } from '../constants/defaultData';

export interface MissingImageItem {
  id: string;
  caption: string;
  phaseKey: string;
  section: string;
}

export interface MissingDataItem {
  category: string;
  label: string;
}

export interface MissingReportSummary {
  missingImages: MissingImageItem[];
  missingData: MissingDataItem[];
  totalMissingImages: number;
  totalMissingData: number;
  totalMissing: number;
  formattedChatText: string;
}

function findMissingImages(photoSlots: Record<string, PhotoSlot>): MissingImageItem[] {
  const result: MissingImageItem[] = [];
  for (const slot of Object.values(photoSlots)) {
    // saved photos keep only imagePath (imageDataUrl is stripped on save), so check both
    const hasImage = slot.isUploaded && Boolean(slot.imagePath || slot.imageDataUrl);
    if (!hasImage) {
      result.push({
        id: slot.id,
        caption: slot.caption || slot.defaultCaption,
        phaseKey: slot.phaseKey,
        section: slot.section,
      });
    }
  }
  return result;
}

function findMissingLocation(state: MaintenanceReportState): MissingDataItem[] {
  const items: MissingDataItem[] = [];
  const loc = state.location;
  if (!loc.lokasi.trim()) items.push({ category: 'Informasi Lokasi', label: 'Nama Lokasi' });
  if (!loc.alamat.trim()) items.push({ category: 'Informasi Lokasi', label: 'Alamat Lokasi' });
  if (!loc.kapasitas.trim()) items.push({ category: 'Informasi Lokasi', label: 'Kapasitas PLTS' });
  if (!loc.jenisAtap.trim()) items.push({ category: 'Informasi Lokasi', label: 'Jenis Atap' });
  if (!loc.pelaksana.trim()) items.push({ category: 'Informasi Lokasi', label: 'Pelaksana Pekerjaan' });
  return items;
}

function findMissingDates(state: MaintenanceReportState): MissingDataItem[] {
  const items: MissingDataItem[] = [];
  for (const r of state.realizationDates) {
    if (!r.tanggalPelaksanaan.trim()) {
      items.push({ category: 'Jadwal Realisasi', label: `Tanggal Pelaksanaan (${r.label})` });
    }
    if (!r.kondisiCuaca.trim()) {
      items.push({ category: 'Jadwal Realisasi', label: `Kondisi Cuaca (${r.label})` });
    }
  }
  return items;
}

function findMissingMeasurements(state: MaintenanceReportState): MissingDataItem[] {
  const items: MissingDataItem[] = [];
  for (const m of state.measurements) {
    if (!m.hasilBefore.trim()) {
      items.push({ category: 'Pengukuran Pra (Before)', label: `${m.parameter}` });
    }
    if (!m.hasilAfter.trim()) {
      items.push({ category: 'Pengukuran Pasca (After)', label: `${m.parameter}` });
    }
  }
  return items;
}

function findMissingChecklist(state: MaintenanceReportState): MissingDataItem[] {
  const items: MissingDataItem[] = [];
  for (const c of state.checklist) {
    if (NON_EDITABLE_CHECKLIST_IDS.has(c.id)) continue;
    if (!c.deskripsi.trim() && !c.keterangan.trim()) {
      items.push({ category: 'Pengecekan Fisik', label: `Item ${c.no} (${c.item})` });
    }
  }
  return items;
}

function buildChatText(
  locationName: string,
  kapasitas: string,
  missingImages: MissingImageItem[],
  missingData: MissingDataItem[]
): string {
  const locTitle = locationName.trim() || 'Lokasi Belum Diisi';
  const capTitle = kapasitas.trim() ? ` (${kapasitas.trim()})` : '';

  if (missingImages.length === 0 && missingData.length === 0) {
    return `*LAPORAN PEMELIHARAAN PLTS*\nLokasi: *${locTitle}*${capTitle}\n\nSemua foto dokumentasi dan data pengukuran telah terisi LENGKAP 100%.\nLaporan siap diekspor ke DOCX.`;
  }

  const lines: string[] = [];
  lines.push(`*DAFTAR BELUM LENGKAP - PEMELIHARAAN PLTS*`);
  lines.push(`Lokasi: *${locTitle}*${capTitle}`);
  lines.push('');

  if (missingImages.length > 0) {
    lines.push(`*FOTO BELUM TERSEDIA (${missingImages.length} foto):*`);
    const bySection: Record<string, string[]> = {};
    for (const img of missingImages) {
      const sec = img.section || 'Dokumentasi';
      if (!bySection[sec]) bySection[sec] = [];
      bySection[sec].push(img.caption);
    }
    for (const [secName, captions] of Object.entries(bySection)) {
      lines.push(`\n[${secName}]`);
      captions.forEach((cap, idx) => {
        lines.push(`${idx + 1}. ${cap}`);
      });
    }
    lines.push('');
  }

  if (missingData.length > 0) {
    lines.push(`*DATA BELUM TERISI (${missingData.length} item):*`);
    const byCategory: Record<string, string[]> = {};
    for (const item of missingData) {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item.label);
    }
    for (const [catName, labels] of Object.entries(byCategory)) {
      lines.push(`\n[${catName}]`);
      labels.forEach((lbl, idx) => {
        lines.push(`${idx + 1}. ${lbl}`);
      });
    }
    lines.push('');
  }

  lines.push(`(Disalin dari Aplikasi PLTS Docs)`);
  return lines.join('\n');
}

export function getMissingReportItems(state: MaintenanceReportState): MissingReportSummary {
  const missingImages = findMissingImages(state.photoSlots);
  const missingData = [
    ...findMissingLocation(state),
    ...findMissingDates(state),
    ...findMissingMeasurements(state),
    ...findMissingChecklist(state),
  ];

  const totalMissingImages = missingImages.length;
  const totalMissingData = missingData.length;
  const totalMissing = totalMissingImages + totalMissingData;

  const formattedChatText = buildChatText(
    state.location.lokasi,
    state.location.kapasitas,
    missingImages,
    missingData
  );

  return {
    missingImages,
    missingData,
    totalMissingImages,
    totalMissingData,
    totalMissing,
    formattedChatText,
  };
}

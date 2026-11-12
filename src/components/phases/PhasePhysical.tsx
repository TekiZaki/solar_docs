// ---
// Summary:
// - Purpose: Form view for Phase II.I Initial Physical Condition Inspection
// - Role: Phase presentation component
// - Depends on: src/context/useReport.ts, src/components/common/PhotoCard.tsx, src/components/common/RealizationDateCard.tsx, src/components/common/PhaseDateBar.tsx
// - Key Responsibilities: Display 12 photo slots, realization date & weather (Pra), and 45-row condition checklist table with non-editable category headers
// - Notes: Group/section header rows disallow Deskripsi and Keterangan inputs
// ---

import React, { useState } from 'react';
import { useReport } from '../../context/useReport';
import { PhotoCard } from '../common/PhotoCard';
import { RealizationDateCard } from '../common/RealizationDateCard';
import { PhaseDateBar } from '../common/PhaseDateBar';
import { NON_EDITABLE_CHECKLIST_IDS } from '../../constants/defaultData';

export const PhasePhysical: React.FC = () => {
  const { state, updateChecklistItem, updateRealizationDate, addPhotoSlot } = useReport();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [photoSearchQuery, setPhotoSearchQuery] = useState<string>('');

  // Filter slots for Phase II.I (physical)
  const physicalSlots = Object.values(state.photoSlots).filter(
    (s) => s.phaseKey === 'physical'
  );

  const filteredSlots = physicalSlots.filter((slot, idx) => {
    if (!photoSearchQuery.trim()) return true;
    const q = photoSearchQuery.toLowerCase().trim();
    const matchCaption = (slot.caption || '').toLowerCase().includes(q);
    const matchDefaultCaption = (slot.defaultCaption || '').toLowerCase().includes(q);
    const matchTarget = (slot.mediaTarget || '').toLowerCase().includes(q);
    const matchDate = (slot.date || '').toLowerCase().includes(q);
    const matchIndex = String(idx + 1) === q;
    return matchCaption || matchDefaultCaption || matchTarget || matchDate || matchIndex;
  });

  // Filter checklist items
  const filteredChecklist = state.checklist.filter((item) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'pv') return item.no.startsWith('1');
    if (filterCategory === 'dc') return item.no.startsWith('2');
    if (filterCategory === 'ac') return item.no.startsWith('3');
    if (filterCategory === 'inverter') return item.no.startsWith('4');
    if (filterCategory === 'rms') return item.no.startsWith('5');
    return true;
  });

  const praDate = state.realizationDates[0];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="border-b border-black pb-3">
        <div className="inline-block text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200 mb-1">
          Tahap II.I
        </div>
        <h2 className="text-xl font-semibold text-slate-900">
          II.I. PENGECEKAN KONDISI INSTALASI
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Inspeksi visual komponen utama PLTS saat tiba di lokasi sebelum pekerjaan pembersihan.
        </p>
      </div>

      {/* Tanggal & Cuaca Realisasi: 1. Pengecekan & Pengukuran Pra Pembersihan */}
      {praDate && (
        <RealizationDateCard
          data={praDate}
          index={0}
          onUpdate={updateRealizationDate}
          badgeLabel="Tahap II.I & II.II"
          note="Tersinkron otomatis dengan tahap Pengukuran Pra Pembersihan"
        />
      )}

      {/* Batch Date Setter */}
      <PhaseDateBar phaseKey="physical" phaseTitle="Tahap II.I" />

      {/* Photo Slots Grid */}
      <div className="space-y-3">
        <div className="top-14 sm:top-16 z-20 shadow-md flex flex-col sm:flex-row sm:items-center justify-between bg-gray-600 px-3 py-2 sm:px-4 sm:py-3 rounded gap-2 sm:gap-3">
          <h3 className="hidden sm:block truncate text-xs sm:text-sm font-semibold text-white">
            Foto Dokumentasi Kondisi Instalasi ({physicalSlots.filter((s) => s.isUploaded).length}/{physicalSlots.length} terisi)
          </h3>

          <div className="flex items-center gap-2 flex-1 sm:max-w-sm sm:mx-2">
            <div className="relative w-full">
              <input
                type="text"
                value={photoSearchQuery}
                onChange={(e) => setPhotoSearchQuery(e.target.value)}
                placeholder="Cari foto instalasi..."
                className="w-full h-8 pl-8 pr-7 text-xs rounded border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
              />
              <svg
                className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {photoSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPhotoSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold px-1"
                  title="Hapus pencarian"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => addPhotoSlot('physical', 'Foto Dokumentasi Kondisi Instalasi', 'START')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
              title="Sisipkan foto baru di awal daftar"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Di Awal</span>
            </button>
            <button
              type="button"
              onClick={() => addPhotoSlot('physical', 'Foto Dokumentasi Kondisi Instalasi')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Foto
            </button>
          </div>
        </div>

        {filteredSlots.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSlots.map((slot) => {
              const originalIndex = physicalSlots.findIndex((s) => s.id === slot.id);
              return (
                <PhotoCard
                  key={slot.id}
                  slot={slot}
                  indexNumber={originalIndex >= 0 ? originalIndex + 1 : undefined}
                />
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-xs text-slate-500">
            Tidak ada foto yang cocok dengan pencarian &quot;{photoSearchQuery}&quot;
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => addPhotoSlot('physical', 'Foto Dokumentasi Kondisi Instalasi')}
            className="w-full text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-dashed border-slate-300 hover:border-slate-800 py-2.5 rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            + Tambah Foto Dokumentasi Kondisi Instalasi
          </button>
        </div>
      </div>

      {/* Checklist Table */}
      <div className="bg-white border border-black rounded-lg p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Tabel Hasil Pengecekan Kondisi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kolom ITEM terkunci. Kategori header tidak memiliki input deskripsi & keterangan, baris komponen dapat disesuaikan.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1 text-xs">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'pv', label: '1. PV' },
              { id: 'dc', label: '2. DC Box' },
              { id: 'ac', label: '3. AC Box' },
              { id: 'inverter', label: '4. Inverter' },
              { id: 'rms', label: '5. RMS' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.id)}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  filterCategory === cat.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-16">NO</th>
                <th className="py-2.5 px-3 w-48">ITEM (TERKUNCI)</th>
                <th className="py-2.5 px-3">DESKRIPSI</th>
                <th className="py-2.5 px-3">KETERANGAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredChecklist.map((row) => {
                const isNonEditable = NON_EDITABLE_CHECKLIST_IDS.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={
                      isNonEditable
                        ? 'bg-slate-100/75 border-y border-slate-200 font-semibold'
                        : 'hover:bg-slate-50/60 transition'
                    }
                  >
                    <td
                      className={`py-2 px-3 font-mono ${
                        isNonEditable ? 'font-bold text-slate-900' : 'text-slate-500 font-medium'
                      }`}
                    >
                      {row.no}
                    </td>
                    <td
                      className={`py-2 px-3 ${
                        isNonEditable ? 'font-bold text-slate-900' : 'font-medium text-slate-800'
                      }`}
                    >
                      {row.item}
                    </td>
                    <td className="py-1.5 px-3">
                      {isNonEditable ? (
                        <span className="text-slate-300 font-mono select-none px-2">—</span>
                      ) : (
                        <input
                          type="text"
                          value={row.deskripsi}
                          onChange={(e) =>
                            updateChecklistItem(row.id, { deskripsi: e.target.value })
                          }
                          className="w-full text-xs px-2 py-1 rounded border border-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      )}
                    </td>
                    <td className="py-1.5 px-3">
                      {isNonEditable ? (
                        <span className="text-slate-300 font-mono select-none px-2">—</span>
                      ) : (
                        <input
                          type="text"
                          value={row.keterangan}
                          onChange={(e) =>
                            updateChecklistItem(row.id, { keterangan: e.target.value })
                          }
                          placeholder="Catatan..."
                          className="w-full text-xs px-2 py-1 rounded border border-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

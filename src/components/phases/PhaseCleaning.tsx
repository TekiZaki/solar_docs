// ---
// Summary:
// - Purpose: Form view for Phase II.III Solar Panel Cleaning Process
// - Role: Phase presentation component
// - Depends on: src/context/useReport.ts, src/components/common/PhotoCard.tsx, src/components/common/RealizationDateCard.tsx, src/components/common/PhaseDateBar.tsx
// - Key Responsibilities: Display realization date & weather (Cleaning) and 12 cleaning and thermal inspection photo slots
// - Notes: Dedicated photo cards for before wash, thermal wash, and post-wash checks
// ---

import React, { useState } from 'react';
import { useReport } from '../../context/useReport';
import { PhotoCard } from '../common/PhotoCard';
import { RealizationDateCard } from '../common/RealizationDateCard';
import { PhaseDateBar } from '../common/PhaseDateBar';

export const PhaseCleaning: React.FC = () => {
  const { state, updateRealizationDate, addPhotoSlot } = useReport();
  const [photoSearchQuery, setPhotoSearchQuery] = useState<string>('');

  const cleaningSlots = Object.values(state.photoSlots).filter(
    (s) => s.phaseKey === 'cleaning'
  );

  const filteredSlots = cleaningSlots.filter((slot, idx) => {
    if (!photoSearchQuery.trim()) return true;
    const q = photoSearchQuery.toLowerCase().trim();
    const matchCaption = (slot.caption || '').toLowerCase().includes(q);
    const matchDefaultCaption = (slot.defaultCaption || '').toLowerCase().includes(q);
    const matchTarget = (slot.mediaTarget || '').toLowerCase().includes(q);
    const matchDate = (slot.date || '').toLowerCase().includes(q);
    const matchIndex = String(idx + 1) === q;
    return matchCaption || matchDefaultCaption || matchTarget || matchDate || matchIndex;
  });

  const cleaningDate = state.realizationDates[1];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="border-b border-black pb-3">
        <div className="inline-block text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 mb-1">
          Tahap II.III
        </div>
        <h2 className="text-xl font-semibold text-slate-900">
          II.III. PEMBERSIHAN
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Dokumentasi proses pembersihan modul surya, pengecekan temperatur termal (pra & pasca cuci), dan kondisi modul.
        </p>
      </div>

      {/* Tanggal & Cuaca Realisasi: 2. Pembersihan Panel Surya */}
      {cleaningDate && (
        <RealizationDateCard
          data={cleaningDate}
          index={1}
          onUpdate={updateRealizationDate}
          badgeLabel="Tahap II.III"
          note="Jadwal pelaksanaan pembersihan panel surya dan thermal inspection"
        />
      )}

      {/* Batch Date Setter */}
      <PhaseDateBar phaseKey="cleaning" phaseTitle="Tahap II.III" />

      {/* Photo Slots Grid */}
      <div className="space-y-3">
        <div className="top-14 sm:top-16 z-20 shadow-md flex flex-col sm:flex-row sm:items-center justify-between bg-gray-600 px-3 py-2 sm:px-4 sm:py-3 rounded gap-2 sm:gap-3">
          <h3 className="hidden sm:block truncate text-xs sm:text-sm font-semibold text-white">
            Foto Dokumentasi Pembersihan Panel Surya ({cleaningSlots.filter((s) => s.isUploaded).length}/{cleaningSlots.length} terisi)
          </h3>

          <div className="flex items-center gap-2 flex-1 sm:max-w-sm sm:mx-2">
            <div className="relative w-full">
              <input
                type="text"
                value={photoSearchQuery}
                onChange={(e) => setPhotoSearchQuery(e.target.value)}
                placeholder="Cari foto pembersihan..."
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
              onClick={() => addPhotoSlot('cleaning', 'Foto Dokumentasi Pembersihan Panel Surya', 'START')}
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
              onClick={() => addPhotoSlot('cleaning', 'Foto Dokumentasi Pembersihan Panel Surya')}
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
              const originalIndex = cleaningSlots.findIndex((s) => s.id === slot.id);
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
            onClick={() => addPhotoSlot('cleaning', 'Foto Dokumentasi Pembersihan Panel Surya')}
            className="w-full text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-dashed border-slate-300 hover:border-slate-800 py-3 rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            + Tambah Foto Dokumentasi Pembersihan
          </button>
        </div>
      </div>
    </div>
  );
};

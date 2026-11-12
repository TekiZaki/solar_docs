// ---
// Summary:
// - Purpose: Sticky top navigation and global action bar with direct save button and missing items trigger
// - Role: Presentation component
// - Depends on: src/context/useReport.ts
// - Key Responsibilities: Display app title, phase breadcrumb, sticky Simpan Sekarang button, save status, missing items trigger, reset, and export trigger
// - Notes: Scandinavian design with high contrast, restrained visual noise, and sticky positioning across all pages
// ---

import React from 'react';
import { useReport } from '../../context/useReport';

interface HeaderProps {
  onGoHome: () => void;
  onOpenExport: () => void;
  onOpenMissingItems: () => void;
  currentPhaseTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onGoHome,
  onOpenExport,
  onOpenMissingItems,
  currentPhaseTitle,
}) => {
  const { state, saveReportNow, saveStatus } = useReport();

  const totalSlots = Object.keys(state.photoSlots).length;
  const uploadedCount = Object.values(state.photoSlots).filter((s) => s.isUploaded).length;
  const missingPhotoCount = totalSlots - uploadedCount;

  return (
    <header className="sticky top-0 inset-x-0 z-30 w-full bg-white border-b border-black shadow-sm">
      <div className="w-full md:w-[90vw] min-w-90vw mx-auto px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-y-2.5 gap-x-3">
        {/* Logo & Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 text-slate-900 font-semibold text-base hover:text-slate-600 transition shrink-0"
            title="Kembali ke Beranda"
          >
            <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
              PV
            </div>
            <span className="inline whitespace-nowrap">PLTS Docs</span>
          </button>

          {currentPhaseTitle && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
              <span className="text-slate-300">/</span>
              <span className="font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded truncate text-[11px] sm:text-xs">
                {currentPhaseTitle}
              </span>
            </div>
          )}
        </div>

        {/* Actions & Status */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          <div className="hidden lg:flex flex-col justify-center text-right h-9 rounded border border-black px-2.5 bg-white">
            <span className="text-xs font-semibold text-black truncate max-w-[180px] leading-tight">
              {state.location.lokasi || 'Belum Ada Lokasi'}
            </span>
            <span className="text-[10px] text-slate-500 leading-tight">
              {uploadedCount} / {totalSlots} foto terisi
            </span>
          </div>

          {/* Status Indicator */}
          {saveStatus === 'unsaved' && (
            <span className="h-9 inline-flex items-center gap-1.5 px-2.5 rounded text-[10px] sm:text-[11px] font-medium bg-amber-50 text-amber-900 border border-black leading-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span className="sm:hidden text-left leading-[1.1]">
                Belum<br />Disimpan
              </span>
              <span className="hidden sm:inline">Belum Disimpan</span>
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="h-9 inline-flex items-center gap-1.5 px-2.5 rounded text-[10px] sm:text-[11px] font-medium bg-amber-50 text-amber-800 border border-black leading-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>Menyimpan...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="h-9 inline-flex items-center gap-1.5 px-2.5 rounded text-[10px] sm:text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-black leading-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Tersimpan</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="h-9 inline-flex items-center gap-1.5 px-2.5 rounded text-[10px] sm:text-[11px] font-medium bg-rose-50 text-rose-800 border border-black leading-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span className="sm:hidden text-left leading-[1.1]">
                Gagal<br />Simpan
              </span>
              <span className="hidden sm:inline">Gagal Simpan</span>
            </span>
          )}

          {/* Desktop Only Header Action Buttons (Handled by sticky bottom bar on mobile) */}
          <button
            type="button"
            onClick={() => saveReportNow()}
            className="hidden md:inline-flex h-9 bg-emerald-600 hover:bg-emerald-700 text-black text-xs font-semibold px-3 rounded shadow-sm transition items-center justify-center gap-1.5 border border-black"
            title="Simpan perubahan langsung ke berkas JSON server (Ctrl+S)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span className="whitespace-nowrap">Simpan Sekarang</span>
          </button>

          <button
            type="button"
            onClick={onOpenMissingItems}
            className="hidden md:inline-flex h-9 text-xs font-semibold text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 rounded border border-black transition items-center justify-center gap-1.5"
            title="Daftar foto dan data yang belum terisi (salin ke chat grup)"
          >
            <svg className="w-3.5 h-3.5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Belum Terisi</span>
            {missingPhotoCount > 0 && (
              <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-amber-300">
                {missingPhotoCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenExport}
            className="hidden md:inline-flex h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 rounded border border-black shadow-sm transition items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export DOCX</span>
          </button>
        </div>
      </div>
    </header>
  );
};

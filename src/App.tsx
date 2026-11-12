// ---
// Summary:
// - Purpose: Root application component with stepped workflow router and phase layout
// - Role: Main view coordinator
// - Depends on: src/context/useReport.ts, src/components/layout/PhaseNav.tsx, src/components/layout/PhaseSelectionHub.tsx, phase components
// - Key Responsibilities: Manage workflow steps (home -> general_info -> phase_select -> active_phase)
// - Notes: Satisfies the exact sequential maintenance workflow requested by the user
// ---

import React, { useState } from 'react';
import { Header } from './components/common/Header';
import { PhaseNav } from './components/layout/PhaseNav';
import type { PhaseTab } from './components/layout/PhaseNav';
import { PhaseSelectionHub } from './components/layout/PhaseSelectionHub';
import type { MaintenancePhaseKey } from './components/layout/PhaseSelectionHub';
import { GeneralInfo } from './components/phases/GeneralInfo';
import { PhasePhysical } from './components/phases/PhasePhysical';
import { PhasePreMeasure } from './components/phases/PhasePreMeasure';
import { PhaseCleaning } from './components/phases/PhaseCleaning';
import { PhasePostMeasure } from './components/phases/PhasePostMeasure';
import { PhaseAnalysis } from './components/phases/PhaseAnalysis';
import { PhaseDamageRec } from './components/phases/PhaseDamageRec';
import { ExportModal } from './components/common/ExportModal';
import { MissingItemsModal } from './components/common/MissingItemsModal';
import { ScrollButtons } from './components/common/ScrollButtons';
import { ResetPage } from './components/pages/ResetPage';
import { useReport } from './context/useReport';

type ViewMode = 'home' | 'general_info' | 'phase_select' | 'active_phase' | 'settings';

export const AppContent: React.FC = () => {
  const { state, saveReportNow, refreshCurrentReport, hasUnsavedChanges } = useReport();
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [selectedPhase, setSelectedPhase] = useState<MaintenancePhaseKey>('physical');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);

  // Fetch new data immediately when navigating to another view or phase (skipped while edits are unsaved)
  const isInitialNav = React.useRef(true);
  React.useEffect(() => {
    if (isInitialNav.current) {
      isInitialNav.current = false;
      return;
    }
    refreshCurrentReport();
  }, [currentView, selectedPhase, refreshCurrentReport]);

  // Sync fresh data when tab or window regains focus, debounced so both events produce one fetch
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleSync = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        refreshCurrentReport();
      }, 1000);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        scheduleSync();
      }
    };
    window.addEventListener('focus', scheduleSync);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      window.removeEventListener('focus', scheduleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshCurrentReport]);

  // Warn before closing or reloading with unsaved edits
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Global Ctrl+S and Cmd+S shortcut to save report
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveReportNow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveReportNow]);

  const getPhaseTitle = (phase: MaintenancePhaseKey): string => {
    switch (phase) {
      case 'physical':
        return 'II.I. Pengecekan Kondisi Instalasi';
      case 'pre_measure':
        return 'II.II. Pengukuran Pra Pembersihan';
      case 'cleaning':
        return 'II.III. Pembersihan';
      case 'post_measure':
        return 'II.IV. Pengukuran Pasca Pembersihan';
      case 'analysis':
        return 'III. Analisa Performa';
      case 'damage_rec':
        return 'IV. Kesimpulan & Rekomendasi';
    }
  };

  const handleSelectTabFromNav = (tab: PhaseTab) => {
    if (tab === 'general') {
      setCurrentView('general_info');
    } else {
      setSelectedPhase(tab as MaintenancePhaseKey);
      setCurrentView('active_phase');
    }
  };

  const handleSelectPhaseFromHub = (phase: MaintenancePhaseKey) => {
    setSelectedPhase(phase);
    setCurrentView('active_phase');
  };

  const totalSlots = Object.keys(state.photoSlots).length;
  const uploadedCount = Object.values(state.photoSlots).filter((s) => s.isUploaded).length;
  const missingPhotoCount = totalSlots - uploadedCount;

  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <header className="bg-white border-b border-black py-4 px-4 sm:px-6 text-left">
          <div className="w-full md:w-[90vw] min-w-90vw mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                PV
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900 m-0 leading-tight">
                  Sistem Dokumentasi PLTS Rooftop
                </h1>
                <p className="text-xs text-slate-500 m-0">
                  Sistem Dokumentasi Pemeliharaan PLTS Atap
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrentView('settings')}
              aria-label="Pengaturan dan Reset"
              title="Pengaturan dan Reset Berkas"
              className="w-9 h-9 rounded-lg border border-black bg-white hover:bg-slate-100 flex items-center justify-center text-slate-800 transition shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </header>

        <main className="w-full md:w-[90vw] min-w-90vw mx-auto px-4 py-8 sm:py-12 text-left space-y-8 flex-1">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 m-0 tracking-tight">
              Pilih Alur Pekerjaan
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Dokumentasi terstruktur on-site dengan pengelompokan foto otomatis dan ekspor dokumen Word resmi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Maintenance Workflow Card */}
            <div className="bg-white border-2 border-slate-900 rounded-xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-6 group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Aktif
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Maintenance (Pemeliharaan)</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Alur inspeksi fisik instalasi, pengukuran pra-cuci, pembersihan modul surya, pengukuran pasca-cuci, analisa deviasi STC, dan ekspor ke format DOCX standar dinas.
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                  <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">90 Slot Foto</span>
                  <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">Checklist Fisik</span>
                  <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">Auto Kalkulasi STC</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCurrentView('general_info')}
                className="w-full bg-slate-900 group-hover:bg-slate-800 text-white text-sm font-semibold py-3 rounded-lg shadow-sm transition flex items-center justify-center gap-2"
              >
                <span>Buka Dokumentasi Pemeliharaan</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>

            {/* Installation Card (Coming Soon) */}
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-6 opacity-75 flex flex-col justify-between gap-6 cursor-not-allowed">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-slate-300 text-slate-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Coming Soon
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-700">Installation (Pemasangan Baru)</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Dokumentasi komisioning instalasi baru sistem PLTS rooftop, uji laik operasi, dan berita acara serah terima pekerjaan.
                </p>
              </div>

              <button
                type="button"
                disabled
                className="w-full bg-slate-300 text-slate-500 text-sm font-semibold py-3 rounded-lg cursor-not-allowed"
              >
                Segera Hadir
              </button>
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-400 text-center">
          Footer disini
        </footer>

        <ScrollButtons />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <Header
        onGoHome={() => setCurrentView('home')}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenMissingItems={() => setIsMissingModalOpen(true)}
        currentPhaseTitle={
          currentView === 'general_info'
            ? 'Informasi Umum'
            : currentView === 'settings'
            ? 'Pengaturan & Reset'
            : currentView === 'phase_select'
            ? 'Pilihan Tahap'
            : getPhaseTitle(selectedPhase)
        }
      />

      {/* Main Workflow View Routing */}
      <main className="w-full md:w-[90vw] min-w-90vw mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-8 md:pb-6 flex-1">
        {currentView === 'settings' && (
          <ResetPage onBack={() => setCurrentView('home')} />
        )}

        {currentView === 'general_info' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pb-2">
              <button
                type="button"
                onClick={() => setCurrentView('home')}
                className="inline-flex items-center gap-1 hover:text-slate-900 transition font-medium"
              >
                &larr; Kembali ke Pilihan Alur
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('phase_select')}
                className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold transition self-end sm:self-auto"
              >
                Langsung ke Pilihan Tahap &rarr;
              </button>
            </div>
            <GeneralInfo onContinueToPhases={() => setCurrentView('phase_select')} />
          </div>
        )}

        {currentView === 'phase_select' && (
          <div className="space-y-4">
            <div className="flex items-center text-xs text-slate-500 pb-2">
              <button
                type="button"
                onClick={() => setCurrentView('general_info')}
                className="inline-flex items-center gap-1 hover:text-slate-900 transition font-medium"
              >
                &larr; Kembali ke Informasi Umum & Lokasi
              </button>
            </div>
            <PhaseSelectionHub
              onSelectPhase={handleSelectPhaseFromHub}
              onEditGeneralInfo={() => setCurrentView('general_info')}
              onOpenExport={() => setIsExportOpen(true)}
              onOpenMissingItems={() => setIsMissingModalOpen(true)}
            />
          </div>
        )}

        {currentView === 'active_phase' && (
          <div className="space-y-6">
            {/* Context Navigation Bar */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('phase_select')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition border border-black"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Daftar Tahap</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('general_info')}
                  className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded transition font-medium border border-black"
                >
                  Ubah Info Lokasi
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-600 hidden sm:block border border-black px-2 py-1.5 rounded">
                  <span className="text-black mr-1.5">Lokasi:</span>
                  <span className="font-semibold text-black">
                    {state.location.lokasi || 'Belum diisi'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => saveReportNow()}
                  title="Simpan sekarang (Ctrl+S)"
                  className="bg-emerald-600 hover:bg-emerald-700 text-black text-xs font-semibold px-3 py-1.5 rounded shadow-sm transition flex items-center gap-1.5 border border-black"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>Simpan Sekarang</span>
                </button>
              </div>
            </div>

            {/* Quick Phase Navigation Tabs */}
            <PhaseNav
              currentTab={selectedPhase}
              onSelectTab={handleSelectTabFromNav}
            />

            {/* Only Render The Selected Phase Component (All Others Hidden) */}
            {selectedPhase === 'physical' && <PhasePhysical />}
            {selectedPhase === 'pre_measure' && <PhasePreMeasure />}
            {selectedPhase === 'cleaning' && <PhaseCleaning />}
            {selectedPhase === 'post_measure' && <PhasePostMeasure />}
            {selectedPhase === 'analysis' && <PhaseAnalysis />}
            {selectedPhase === 'damage_rec' && <PhaseDamageRec />}
          </div>
        )}
      </main>

      {/* Sticky Bottom Actions on Mobile */}
      <div className="md:hidden sticky bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-300 p-2 sm:p-2.5 flex items-center justify-between gap-2 shadow-lg">
        <button
          type="button"
          onClick={() => saveReportNow()}
          title="Simpan (Ctrl+S)"
          className="bg-emerald-600 hover:bg-emerald-700 text-black text-xs font-semibold px-3 py-2 rounded shadow-sm flex items-center gap-1.5 shrink-0 border border-black"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span>Simpan</span>
        </button>
        <button
          type="button"
          onClick={() => setIsMissingModalOpen(true)}
          className="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold px-2.5 py-2 rounded border border-black transition flex items-center gap-1.5 shrink-0"
        >
          <span>Belum Terisi</span>
          {missingPhotoCount > 0 && (
            <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-amber-200">
              {missingPhotoCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setIsExportOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded shadow-sm shrink-0 flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export DOCX</span>
        </button>
      </div>

      {/* Floating Scroll Top / Bottom Navigator */}
      <ScrollButtons />

      {/* Export Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />

      {/* Missing Items Modal */}
      <MissingItemsModal isOpen={isMissingModalOpen} onClose={() => setIsMissingModalOpen(false)} />
    </div>
  );
};

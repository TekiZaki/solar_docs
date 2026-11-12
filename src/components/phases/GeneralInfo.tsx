// ---
// Summary:
// - Purpose: Form view for site general metadata, building photo, and project save file management
// - Role: Phase presentation component
// - Depends on: src/context/useReport.ts, src/components/common/PhotoCard.tsx
// - Key Responsibilities: Manage project save files (switch, create, save status), edit Lokasi, Alamat, Kapasitas, Jenis Atap, Pelaksana, and building photo
// - Notes: Eliminates localStorage quota limits by syncing directly with disk-backed JSON reports
// ---

import React, { useState } from 'react';
import { useReport } from '../../context/useReport';
import { PhotoCard } from '../common/PhotoCard';
import { ProjectFileSelect } from '../common/ProjectFileSelect';

interface GeneralInfoProps {
  onContinueToPhases?: () => void;
}

export const GeneralInfo: React.FC<GeneralInfoProps> = ({ onContinueToPhases }) => {
  const {
    state,
    currentReportId,
    reportList,
    saveStatus,
    lastSavedAt,
    hasUnsavedChanges,
    loadReport,
    saveReportNow,
    createReport,
    refreshReportList,
    updateLocation,
  } = useReport();

  const [showNewModal, setShowNewModal] = useState(false);
  const [newReportName, setNewReportName] = useState('');
  const [newReportLokasi, setNewReportLokasi] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // loading another berkas discards local edits, so ask first when dirty
  const confirmIfDirty = () =>
    !hasUnsavedChanges || window.confirm('Perubahan belum disimpan, lanjutkan?');

  const coverSlot = state.photoSlots['slot_001'];

  const handleCreateNewReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportName.trim()) return;
    setIsSubmitting(true);
    try {
      const createdId = await createReport(newReportName.trim(), newReportLokasi.trim());
      if (createdId) {
        setShowNewModal(false);
        setNewReportName('');
        setNewReportLokasi('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Section Header */}
      <div className="border-b border-black pb-3">
        <h2 className="text-xl font-semibold text-slate-900">Informasi Umum & Lokasi Pekerjaan</h2>
        <p className="text-xs text-slate-500 mt-1">
          Identitas gedung, kapasitas sistem PLTS, berkas penyimpanan proyek, dan foto dokumentasi bangunan sekolah / lokasi pekerjaan.
        </p>
      </div>

      {/* Save File Project Management Card */}
      <div className="bg-gray-600 border border-slate-200 rounded-lg p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Berkas Laporan Proyek (Save File)</h3>
              {saveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Menyimpan...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Tersimpan di Disk {lastSavedAt ? `(${lastSavedAt})` : ''}
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Gagal Tersambung Server
                </span>
              )}
            </div>
            <p className="text-xs text-white mt-0.5">
              Berkas tersimpan pada server backend (disk JSON).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => saveReportNow()}
              className="text-xs px-3 py-1.5 rounded border border-slate-300 hover:bg-black text-white font-medium transition"
              title="Simpan perubahan langsung ke berkas JSON"
            >
              Simpan Sekarang
            </button>
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="text-xs px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium transition flex items-center gap-1"
            >
              <span>+ Berkas Baru</span>
            </button>
          </div>
        </div>

        {/* File Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-white mb-1">
              Pilih Berkas Proyek Aktif:
            </label>
            <ProjectFileSelect
              reports={reportList}
              selectedId={currentReportId}
              activeReportId={currentReportId}
              onSelect={(id) => {
                if (confirmIfDirty()) loadReport(id);
              }}
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                if (!confirmIfDirty()) return;
                refreshReportList();
                loadReport(currentReportId);
              }}
              className="w-full h-10 text-xs font-medium px-3 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Muat Ulang Daftar Berkas</span>
            </button>
          </div>
        </div>

        {/* Modal / Card for New Report */}
        {showNewModal && (
          <form
            onSubmit={handleCreateNewReport}
            className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Buat Berkas Laporan Proyek Baru
              </h4>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Berkas Proyek <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: REPORT_MT PLTS JKT_SMAN_27"
                  value={newReportName}
                  onChange={(e) => setNewReportName(e.target.value)}
                  className="w-full text-sm px-3 py-1.5 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lokasi / Sekolah
                </label>
                <input
                  type="text"
                  placeholder="Contoh: SMA Negeri 27 Jakarta"
                  value={newReportLokasi}
                  onChange={(e) => setNewReportLokasi(e.target.value)}
                  className="w-full text-sm px-3 py-1.5 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-xs px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newReportName.trim()}
                className="text-xs px-4 py-1.5 rounded bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {isSubmitting ? 'Membuat...' : 'Buat & Aktifkan Berkas'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Main Info Grid */}
      <div className="bg-gray-600 border border-slate-200 rounded-lg p-4 sm:p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-semibold text-white">Data Administrasi Gedung</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-1">
              Nama Lokasi / Gedung <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={state.location.lokasi}
              onChange={(e) => updateLocation({ lokasi: e.target.value })}
              placeholder="Contoh: SMP Negeri 72 Jakarta"
              className="w-full text-sm px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <p className="text-[11px] text-white mt-1">
              Nama lokasi akan otomatis tersinkron ke cover, tabel analisis, dan kesimpulan.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-white mb-1">
              Kapasitas Terpasang
            </label>
            <input
              type="text"
              value={state.location.kapasitas}
              onChange={(e) => updateLocation({ kapasitas: e.target.value })}
              placeholder="Contoh: 15 kWp atau 20 kWp"
              className="w-full text-sm px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-white mb-1">
              Alamat Lengkap Gedung <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={state.location.alamat}
              onChange={(e) => updateLocation({ alamat: e.target.value })}
              placeholder="Contoh: Jl. Petojo Binatu Raya No.2 1, RT.1/RW.8, Petojo Utara, Jakarta Pusat..."
              className="w-full text-sm px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white mb-1">Jenis Atap</label>
            <input
              type="text"
              value={state.location.jenisAtap}
              onChange={(e) => updateLocation({ jenisAtap: e.target.value })}
              placeholder="Contoh: Atap Miring (Genteng) / Dak Beton"
              className="w-full text-sm px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white mb-1">Pelaksana</label>
            <input
              type="text"
              value={state.location.pelaksana}
              onChange={(e) => updateLocation({ pelaksana: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Building Photo (I.III. LOKASI PEKERJAAN) */}
      <div className="bg-white border border-black rounded-lg p-4 sm:p-5 space-y-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Foto Bangunan Gedung (Lokasi Pekerjaan)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Foto tampak bangunan gedung sekolah atau lokasi pekerjaan (I.III. LOKASI PEKERJAAN). Logo DKI Jakarta pada sampul tetap terkunci sesuai standar dinas.
          </p>
        </div>

        <div className="max-w-md">
          {coverSlot && <PhotoCard slot={coverSlot} indexNumber={1} hideDate />}
        </div>
      </div>

      {onContinueToPhases && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onContinueToPhases}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-6 py-3 rounded-lg shadow-sm transition flex items-center justify-center gap-2"
          >
            <span>Lanjut: Pilih Tahap Pemeliharaan</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

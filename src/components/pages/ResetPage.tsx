// ---
// Summary:
// - Purpose: Dedicated page for resetting report data with explicit confirmation dialog
// - Role: Presentation page component
// - Depends on: src/context/useReport.ts, src/components/common/ResetConfirmationModal.tsx
// - Key Responsibilities: Provide report summary and secure reset trigger backed by confirmation modal
// - Notes: Satisfies the requirement of moving the reset button to its own page
// ---

import React, { useState } from 'react';
import { useReport } from '../../context/useReport';
import { ResetConfirmationModal } from '../common/ResetConfirmationModal';
import { ProjectFileSelect } from '../common/ProjectFileSelect';

interface ResetPageProps {
  onBack: () => void;
}

export const ResetPage: React.FC<ResetPageProps> = ({ onBack }) => {
  const { state, currentReportId, reportList, refreshReportList, resetAll } = useReport();
  const [selectedReportId, setSelectedReportId] = useState<string>(currentReportId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  React.useEffect(() => {
    refreshReportList();
  }, [refreshReportList]);

  React.useEffect(() => {
    if (!selectedReportId && currentReportId) {
      setSelectedReportId(currentReportId);
    }
  }, [currentReportId, selectedReportId]);

  const targetReportSummary = reportList.find((r) => r.id === selectedReportId);
  const isCurrentActive = selectedReportId === currentReportId;

  const displayName = targetReportSummary?.name || selectedReportId;
  const displayLocation = isCurrentActive
    ? state.location.lokasi || 'Belum diisi'
    : targetReportSummary?.lokasi || 'Belum diisi';
  const displayPhotoCount = isCurrentActive
    ? Object.values(state.photoSlots).filter((s) => s.isUploaded).length
    : targetReportSummary?.photoCount ?? 0;

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await resetAll(selectedReportId);
      setIsModalOpen(false);
      setResetSuccessMessage(`Berkas "${displayName}" berhasil di-reset ke template default.`);
      setTimeout(() => {
        setResetSuccessMessage(null);
      }, 5000);
    } catch (e) {
      console.error('Reset error:', e);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between border-b border-black pb-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium mb-1 transition"
          >
            &larr; Kembali ke Beranda
          </button>
          <h2 className="text-xl font-semibold text-slate-900">
            Pengaturan & Reset Laporan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pilih berkas laporan yang ingin direset kembali ke format template default.
          </p>
        </div>
      </div>

      {resetSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-medium">
          {resetSuccessMessage}
        </div>
      )}

      {/* Target File Selector Card */}
      <div className="bg-white border border-black rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Pilih Berkas yang Akan Direset</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih dari seluruh berkas laporan yang tersimpan di server.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refreshReportList()}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-300 px-2.5 py-1.5 rounded transition self-start sm:self-auto"
          >
            Muat Ulang Berkas
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Daftar Berkas Laporan:
          </label>
          <ProjectFileSelect
            reports={reportList}
            selectedId={selectedReportId}
            activeReportId={currentReportId}
            onSelect={(id) => setSelectedReportId(id)}
          />
        </div>

        {/* Selected File Details */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 block">ID Berkas:</span>
            <span className="font-mono font-semibold text-slate-900 break-all">{selectedReportId}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 block">Lokasi:</span>
            <span className="font-semibold text-slate-900">{displayLocation}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 block">Status Foto:</span>
            <span className="font-semibold text-slate-900">{displayPhotoCount} foto terisi</span>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 block">Status Sesi:</span>
            <span className={`font-semibold ${isCurrentActive ? 'text-emerald-700' : 'text-slate-600'}`}>
              {isCurrentActive ? 'Sedang Dibuka' : 'Tersimpan di Disk'}
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone: Reset Card */}
      <div className="bg-white border border-rose-300 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-rose-700">
            Tindakan Berbahaya: Reset Berkas &quot;{displayName}&quot;
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Menekan tombol reset akan mengembalikan seluruh checklist kondisi fisik, tabel pengukuran pra dan pasca pembersihan, spesifikasi datasheet modul surya, tabel deviasi STC, inventarisasi kerusakan, serta foto dokumentasi pada berkas <strong>{selectedReportId}</strong> ke kondisi template default.
          </p>
        </div>

        <div className="pt-2 border-t border-rose-100 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-slate-500">
            Pastikan Anda telah mengekspor atau menyimpan salinan berkas ini jika datanya masih dibutuhkan.
          </span>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm border border-rose-700 transition"
          >
            Reset Berkas Ini
          </button>
        </div>
      </div>

      <ResetConfirmationModal
        isOpen={isModalOpen}
        targetReportName={selectedReportId}
        isLoading={isResetting}
        onConfirm={handleConfirmReset}
        onCancel={() => setIsModalOpen(false)}
      />
    </div>
  );
};
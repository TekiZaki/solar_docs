// ---
// Summary:
// - Purpose: Dedicated settings page for selective Pre/Post phase swapping and resetting report data
// - Role: Presentation page component
// - Depends on: src/context/useReport.ts, src/lib/reportApi.ts, PhaseSwapSection, ResetConfirmationModal, SwapConfirmationModal, ProjectFileSelect
// - Key Responsibilities: Target report selection, selective Pra/Pasca swap workflow, and secure reset trigger
// ---

import React, { useState, useEffect } from 'react';
import { useReport } from '../../context/useReport';
import { ResetConfirmationModal } from '../common/ResetConfirmationModal';
import { SwapConfirmationModal } from '../common/SwapConfirmationModal';
import { ProjectFileSelect } from '../common/ProjectFileSelect';
import { PhaseSwapSection } from './PhaseSwapSection';
import { fetchReportById } from '../../lib/reportApi';
import { mergeStateWithSlots } from '../../context/reportStateHelpers';
import type { MaintenanceReportState } from '../../types/schema';

interface ResetPageProps {
  onBack: () => void;
}

export const ResetPage: React.FC<ResetPageProps> = ({ onBack }) => {
  const { state, currentReportId, reportList, refreshReportList, resetAll, swapPrePostPhases } =
    useReport();
  const [selectedReportId, setSelectedReportId] = useState<string>(currentReportId);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [selectedPhotoPairIds, setSelectedPhotoPairIds] = useState<string[]>([]);
  const [selectedCustomSlotIds, setSelectedCustomSlotIds] = useState<string[]>([]);
  const [selectedMeasurementIds, setSelectedMeasurementIds] = useState<string[]>([]);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  const [remoteStateEntry, setRemoteStateEntry] = useState<{
    reportId: string;
    reportState: MaintenanceReportState | null;
  } | null>(null);

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    refreshReportList();
  }, [refreshReportList]);

  const effectiveReportId = selectedReportId || currentReportId;
  const isCurrentActive = effectiveReportId === currentReportId;

  useEffect(() => {
    if (!effectiveReportId || isCurrentActive) return;

    const controller = new AbortController();

    fetchReportById(effectiveReportId, controller.signal).then((raw) => {
      if (controller.signal.aborted) return;
      if (raw && typeof raw === 'object') {
        setRemoteStateEntry({
          reportId: effectiveReportId,
          reportState: mergeStateWithSlots(raw),
        });
      } else {
        setRemoteStateEntry({ reportId: effectiveReportId, reportState: null });
      }
    });

    return () => controller.abort();
  }, [effectiveReportId, isCurrentActive]);

  const isLoadingTargetState = Boolean(
    effectiveReportId && !isCurrentActive && remoteStateEntry?.reportId !== effectiveReportId
  );
  const targetState = isCurrentActive
    ? state
    : remoteStateEntry?.reportId === effectiveReportId
    ? remoteStateEntry.reportState
    : null;

  const targetReportSummary = reportList.find((r) => r.id === effectiveReportId);
  const displayName = targetReportSummary?.name || effectiveReportId;
  const displayLocation = isCurrentActive
    ? state.location.lokasi || 'Belum diisi'
    : targetReportSummary?.lokasi || 'Belum diisi';
  const displayPhotoCount = isCurrentActive
    ? Object.values(state.photoSlots).filter((s) => s.isUploaded).length
    : targetReportSummary?.photoCount ?? 0;

  const clearSwapSelections = () => {
    setSelectedPhotoPairIds([]);
    setSelectedCustomSlotIds([]);
    setSelectedMeasurementIds([]);
  };

  const handleSelectReport = (id: string) => {
    setSelectedReportId(id);
    clearSwapSelections();
  };

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage((prev) => (prev?.text === text ? null : prev));
    }, 6000);
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await resetAll(effectiveReportId);
      setIsResetModalOpen(false);
      clearSwapSelections();
      showStatus('success', `Berkas "${displayName}" berhasil di-reset ke template default.`);
    } catch (e) {
      console.error('Reset error:', e);
      showStatus('error', 'Gagal mereset berkas laporan.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleConfirmSwap = async () => {
    const totalSelected =
      selectedPhotoPairIds.length + selectedCustomSlotIds.length + selectedMeasurementIds.length;
    if (totalSelected === 0) return;

    setIsSwapping(true);
    try {
      const outcome = await swapPrePostPhases(effectiveReportId, {
        selectedPhotoPairPreIds: selectedPhotoPairIds,
        selectedCustomSlotIds,
        selectedMeasurementIds,
      });
      setIsSwapModalOpen(false);

      if (!outcome.ok) {
        showStatus('error', outcome.error || 'Gagal menukar data Pra dan Pasca.');
        return;
      }

      if (!isCurrentActive) {
        const refreshed = await fetchReportById(effectiveReportId);
        if (refreshed && typeof refreshed === 'object') {
          setRemoteStateEntry({
            reportId: effectiveReportId,
            reportState: mergeStateWithSlots(refreshed),
          });
        }
      }

      const parts: string[] = [];
      if ((outcome.swappedCatalogPairs ?? 0) > 0 || (outcome.movedCustomSlots ?? 0) > 0) {
        const customSuffix =
          outcome.movedCustomSlots && outcome.movedCustomSlots > 0
            ? ` (+${outcome.movedCustomSlots} kartu tambahan)`
            : '';
        parts.push(`${outcome.swappedCatalogPairs ?? 0} pasangan PhotoCard${customSuffix}`);
      }
      if ((outcome.swappedMeasurements ?? 0) > 0) {
        parts.push(`${outcome.swappedMeasurements ?? 0} baris Tabel Hasil Pengukuran`);
      }

      clearSwapSelections();
      showStatus(
        'success',
        `Berhasil menukar ${parts.join(' dan ')} antara Pengukuran Pra dan Pasca pada berkas "${displayName}".`
      );
    } catch (e) {
      console.error('Swap phases error:', e);
      showStatus('error', 'Terjadi kesalahan saat menukar data fase.');
    } finally {
      setIsSwapping(false);
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
            Pilih item untuk ditukar antara Pengukuran Pra dan Pasca, atau reset berkas laporan kembali ke template default.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Target File Selector Card */}
      <div className="bg-white border border-black rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Pilih Berkas Laporan</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih berkas target dari seluruh laporan yang tersimpan di server.
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
            selectedId={effectiveReportId}
            activeReportId={currentReportId}
            onSelect={handleSelectReport}
          />
        </div>

        {/* Selected File Details */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 block">ID Berkas:</span>
            <span className="font-mono font-semibold text-slate-900 break-all">{effectiveReportId}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 block">Lokasi:</span>
            <span className="font-semibold text-slate-900">{displayLocation}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 block">Status Foto:</span>
            <span className="font-semibold text-slate-900 tabular-nums">{displayPhotoCount} foto terisi</span>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 block">Status Sesi:</span>
            <span className={`font-semibold ${isCurrentActive ? 'text-emerald-700' : 'text-slate-600'}`}>
              {isCurrentActive ? 'Sedang Dibuka' : 'Tersimpan di Disk'}
            </span>
          </div>
        </div>
      </div>

      {/* Selective Phase Swap Section */}
      <PhaseSwapSection
        targetState={targetState}
        isLoadingState={isLoadingTargetState}
        isSwapping={isSwapping}
        selectedPhotoPairIds={selectedPhotoPairIds}
        selectedCustomSlotIds={selectedCustomSlotIds}
        selectedMeasurementIds={selectedMeasurementIds}
        onChangePhotoPairIds={setSelectedPhotoPairIds}
        onChangeCustomSlotIds={setSelectedCustomSlotIds}
        onChangeMeasurementIds={setSelectedMeasurementIds}
        onClearAllSelections={clearSwapSelections}
        onRequestSwap={() => setIsSwapModalOpen(true)}
      />

      {/* Danger Zone: Reset Card */}
      <div className="bg-white border border-rose-300 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-rose-700">
            Tindakan Berbahaya: Reset Berkas &quot;{displayName}&quot;
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Menekan tombol reset akan mengembalikan seluruh checklist kondisi fisik, tabel pengukuran pra dan pasca pembersihan, spesifikasi datasheet modul surya, tabel deviasi STC, inventarisasi kerusakan, serta foto dokumentasi pada berkas <strong>{effectiveReportId}</strong> ke kondisi template default.
          </p>
        </div>

        <div className="pt-2 border-t border-rose-100 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-slate-500">
            Pastikan Anda telah mengekspor atau menyimpan salinan berkas ini jika datanya masih dibutuhkan.
          </span>
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm border border-rose-700 transition"
          >
            Reset Berkas Ini
          </button>
        </div>
      </div>

      <SwapConfirmationModal
        isOpen={isSwapModalOpen}
        targetReportName={effectiveReportId}
        selectedPhotoPairCount={selectedPhotoPairIds.length}
        selectedCustomSlotCount={selectedCustomSlotIds.length}
        selectedMeasurementCount={selectedMeasurementIds.length}
        isLoading={isSwapping}
        onConfirm={handleConfirmSwap}
        onCancel={() => setIsSwapModalOpen(false)}
      />

      <ResetConfirmationModal
        isOpen={isResetModalOpen}
        targetReportName={effectiveReportId}
        isLoading={isResetting}
        onConfirm={handleConfirmReset}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </div>
  );
};

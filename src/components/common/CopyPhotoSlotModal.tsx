// ---
// Summary:
// - Purpose: Modal dialog for copying a PhotoCard (photo and description) to any report on Lokal or Prod
// - Role: Presentation & workflow modal component
// - Depends on: src/context/useReport.ts, src/lib/crossReportPhotoCopy.ts, src/context/reportStateHelpers.ts, ./ProjectFileSelect.tsx
// - Key Responsibilities: Select Lokal/Prod target, choose report file, select phase and overwrite/insert slot, and execute copy
// ---

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import type { PhotoSlot } from '../../types/schema';
import type { ReportSummary } from '../../context/reportContextInstance';
import { useReport } from '../../context/useReport';
import { mergeStateWithSlots } from '../../context/reportStateHelpers';
import { ProjectFileSelect } from './ProjectFileSelect';
import {
  type CopyPlacementMode,
  type TargetEnvironment,
  copyPhotoSlotToRemoteReport,
  fetchReportListFromApi,
  fetchReportRecordFromApi,
  getCurrentEnvironment,
  getSavedRemoteUrl,
  normalizeBaseUrl,
  readSourceSlotPayload,
  resolveApiEndpoint,
  saveRemoteUrl,
} from '../../lib/crossReportPhotoCopy';

interface CopyPhotoSlotModalProps {
  isOpen: boolean;
  sourceSlot: PhotoSlot;
  sourcePreviewUrl?: string;
  onClose: () => void;
}

const PHASE_OPTIONS: Array<{ key: PhotoSlot['phaseKey']; label: string }> = [
  { key: 'general', label: 'I. Informasi Umum (Cover)' },
  { key: 'physical', label: 'II.I. Pengecekan Kondisi Instalasi' },
  { key: 'pre_measure', label: 'II.II. Pengukuran Pra Pembersihan' },
  { key: 'cleaning', label: 'II.III. Pembersihan Panel Surya' },
  { key: 'post_measure', label: 'II.IV. Pengukuran Pasca Pembersihan' },
];

export const CopyPhotoSlotModal: React.FC<CopyPhotoSlotModalProps> = ({
  isOpen,
  sourceSlot,
  sourcePreviewUrl,
  onClose,
}) => {
  const { state, currentReportId, reportList, refreshReportList, applyCopiedPhotoSlot } = useReport();
  const currentEnv = getCurrentEnvironment();

  const [targetEnv, setTargetEnv] = useState<TargetEnvironment>(currentEnv);
  const [remoteUrlInput, setRemoteUrlInput] = useState<string>(() =>
    getSavedRemoteUrl(currentEnv === 'local' ? 'prod' : 'local')
  );
  const [showUrlEditor, setShowUrlEditor] = useState(false);

  const [targetReports, setTargetReports] = useState<ReportSummary[]>(reportList);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError, setListError] = useState('');

  const [targetReportId, setTargetReportId] = useState<string>(currentReportId);
  const [targetSlotsMap, setTargetSlotsMap] = useState<Record<string, PhotoSlot>>(state.photoSlots);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const [targetPhaseKey, setTargetPhaseKey] = useState<PhotoSlot['phaseKey']>(sourceSlot.phaseKey);
  const [mode, setMode] = useState<CopyPlacementMode>('overwrite');
  const [selectedSlotId, setSelectedSlotId] = useState<string>(sourceSlot.id);
  const [insertAfterId, setInsertAfterId] = useState<string | null>(null);
  const [includeDate, setIncludeDate] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const loadReportsForEnv = useCallback(
    async (env: TargetEnvironment, urlOverride?: string) => {
      setIsLoadingList(true);
      setListError('');
      setSubmitError('');
      setSubmitSuccess('');
      try {
        let list: ReportSummary[];
        if (env === currentEnv) {
          list = await refreshReportList();
        } else {
          const endpoint = resolveApiEndpoint(env, urlOverride ?? remoteUrlInput);
          list = await fetchReportListFromApi(endpoint);
        }
        setTargetReports(list);
        setTargetReportId((prev) => {
          if (list.some((r) => r.id === prev)) return prev;
          if (list.some((r) => r.id === currentReportId)) return currentReportId;
          return list[0]?.id || '';
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat daftar berkas.';
        setListError(msg);
        setTargetReports([]);
        setTargetReportId('');
      } finally {
        setIsLoadingList(false);
      }
    },
    [currentEnv, currentReportId, refreshReportList, remoteUrlInput]
  );

  useEffect(() => {
    if (!isOpen) return;
    loadReportsForEnv(targetEnv);
  }, [isOpen, targetEnv, loadReportsForEnv]);

  useEffect(() => {
    if (!isOpen || !targetReportId) return;
    if (targetEnv === currentEnv && targetReportId === currentReportId) {
      return;
    }

    let cancelled = false;
    const loadSlots = async () => {
      setSlotsError('');
      setIsLoadingSlots(true);
      try {
        const endpoint = resolveApiEndpoint(targetEnv, remoteUrlInput);
        const raw = await fetchReportRecordFromApi(endpoint, targetReportId);
        if (cancelled) return;
        const merged = mergeStateWithSlots({ ...raw, id: targetReportId });
        setTargetSlotsMap(merged.photoSlots);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Gagal memuat slot berkas tujuan.';
        setSlotsError(msg);
        setTargetSlotsMap({});
      } finally {
        if (!cancelled) setIsLoadingSlots(false);
      }
    };

    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [isOpen, targetEnv, targetReportId, currentEnv, currentReportId, remoteUrlInput]);

  const isTargetCurrentReport = targetEnv === currentEnv && targetReportId === currentReportId;
  const activeTargetSlotsMap = isTargetCurrentReport ? state.photoSlots : targetSlotsMap;

  const phaseSlots = useMemo(
    () => Object.values(activeTargetSlotsMap).filter((s) => s.phaseKey === targetPhaseKey),
    [activeTargetSlotsMap, targetPhaseKey]
  );

  if (!isOpen) return null;

  const sameIdMatch = phaseSlots.find((s) => s.id === sourceSlot.id);
  const effectiveSelectedSlotId =
    selectedSlotId && phaseSlots.some((s) => s.id === selectedSlotId)
      ? selectedSlotId
      : sameIdMatch?.id || phaseSlots[0]?.id || '';
  const effectiveInsertAfterId =
    insertAfterId === 'START' ||
    insertAfterId === 'END' ||
    (insertAfterId !== null && phaseSlots.some((s) => s.id === insertAfterId))
      ? insertAfterId
      : sameIdMatch?.id || 'END';

  const hasSourcePhoto = Boolean(
    sourceSlot.isUploaded && (sourceSlot.imageDataUrl || sourceSlot.imagePath || sourcePreviewUrl)
  );
  const effectiveMode: CopyPlacementMode = targetPhaseKey === 'general' ? 'overwrite' : mode;

  const handleApplyRemoteUrl = () => {
    const saved = saveRemoteUrl(targetEnv, remoteUrlInput);
    if (!saved) {
      setListError('URL harus diawali http:// atau https://');
      return;
    }
    setRemoteUrlInput(saved);
    setShowUrlEditor(false);
    loadReportsForEnv(targetEnv, saved);
  };

  const handleCopySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReportId) {
      setSubmitError('Pilih berkas laporan tujuan terlebih dahulu.');
      return;
    }
    if (effectiveMode === 'overwrite' && !effectiveSelectedSlotId) {
      setSubmitError('Pilih slot tujuan terlebih dahulu.');
      return;
    }
    if (!hasSourcePhoto && !sourceSlot.caption.trim()) {
      setSubmitError('Kartu sumber belum memiliki foto maupun deskripsi.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const sourcePayload = await readSourceSlotPayload(sourceSlot);
      const insertTarget =
        effectiveInsertAfterId === 'END' ? undefined : effectiveInsertAfterId;

      if (isTargetCurrentReport) {
        const res = await applyCopiedPhotoSlot({
          targetPhaseKey,
          mode: effectiveMode,
          targetSlotId: effectiveSelectedSlotId,
          insertAfterSlotId: insertTarget,
          includeDate,
          sourcePayload,
        });
        setSubmitSuccess(
          `Disalin ke berkas aktif (${targetReportId} • ${res.finalSlotId}).`
        );
      } else {
        const endpoint = resolveApiEndpoint(targetEnv, remoteUrlInput);
        const res = await copyPhotoSlotToRemoteReport({
          apiEndpoint: endpoint,
          targetReportId,
          targetPhaseKey,
          mode: effectiveMode,
          targetSlotId: effectiveSelectedSlotId,
          insertAfterSlotId: insertTarget,
          includeDate,
          sourcePayload,
        });

        // Refresh slot list if copying into another report so status badges update
        const updatedRaw = await fetchReportRecordFromApi(endpoint, targetReportId);
        setTargetSlotsMap(mergeStateWithSlots({ ...updatedRaw, id: targetReportId }).photoSlots);

        const envLabel = targetEnv === 'prod' ? 'Prod' : 'Lokal';
        setSubmitSuccess(
          `Disalin ke ${envLabel} (${targetReportId} • ${res.finalSlotId}).`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyalin kartu foto.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-photo-slot-title"
        className="bg-white rounded-lg max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 shadow-xl border border-slate-200 text-left space-y-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 id="copy-photo-slot-title" className="font-semibold text-base text-slate-900">
              Salin Foto &amp; Deskripsi ke Berkas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kirim foto dan deskripsi kartu ini ke berkas Lokal atau Prod.
            </p>
          </div>
          {!isSubmitting && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
              aria-label="Tutup dialog"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Source Preview */}
        <div className="flex items-start gap-3 p-2.5 rounded border border-slate-200 bg-slate-50">
          <div className="w-12 aspect-[3/4] rounded border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
            {hasSourcePhoto && sourcePreviewUrl ? (
              <img
                src={sourcePreviewUrl}
                alt={sourceSlot.caption || 'Pratinjau'}
                className={`w-full h-full ${sourceSlot.isFitted ? 'object-contain' : 'object-cover'}`}
              />
            ) : (
              <span className="text-[9px] text-slate-400 text-center px-1">Tanpa foto</span>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                {sourceSlot.id}
              </span>
              <span className="text-[10px] text-slate-500">
                {PHASE_OPTIONS.find((p) => p.key === sourceSlot.phaseKey)?.label}
              </span>
            </div>
            <p className="text-xs text-slate-800 line-clamp-2 leading-snug">
              {sourceSlot.caption.trim() || <span className="text-slate-400 italic">Tanpa deskripsi</span>}
            </p>
          </div>
        </div>

        <form onSubmit={handleCopySubmit} className="space-y-3.5">
          {/* Target Environment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">1. Server Tujuan</label>
              {targetEnv !== currentEnv && (
                <button
                  type="button"
                  onClick={() => setShowUrlEditor((v) => !v)}
                  className="text-[11px] text-slate-600 hover:text-slate-900 underline"
                >
                  {showUrlEditor ? 'Tutup URL' : 'Atur URL'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['local', 'prod'] as TargetEnvironment[]).map((env) => {
                const active = targetEnv === env;
                const isHere = env === currentEnv;
                return (
                  <button
                    key={env}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setTargetEnv(env);
                      if (env !== currentEnv) {
                        setRemoteUrlInput(getSavedRemoteUrl(env));
                      }
                      setSlotsError('');
                    }}
                    className={`px-3 py-2 rounded border text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{env === 'local' ? 'Lokal' : 'Prod'}</span>
                    {isHere && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded ${
                          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Server ini
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {targetEnv !== currentEnv && (
              <div className="text-[11px] text-slate-500 truncate">
                Target: <span className="font-mono text-slate-700">{normalizeBaseUrl(remoteUrlInput) || remoteUrlInput}</span>
              </div>
            )}

            {targetEnv !== currentEnv && showUrlEditor && (
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="url"
                  value={remoteUrlInput}
                  onChange={(e) => setRemoteUrlInput(e.target.value)}
                  placeholder={targetEnv === 'prod' ? 'https://tekizaki.my.id/projects/public/solar-docs/' : 'http://localhost:8000/'}
                  className="flex-1 text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
                <button
                  type="button"
                  onClick={handleApplyRemoteUrl}
                  className="text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-900 text-white font-medium shrink-0"
                >
                  Terapkan
                </button>
              </div>
            )}
          </div>

          {/* Target Report File */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800">2. Berkas Laporan Tujuan</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <ProjectFileSelect
                  reports={targetReports}
                  selectedId={targetReportId}
                  activeReportId={targetEnv === currentEnv ? currentReportId : undefined}
                  onSelect={(id) => {
                    setTargetReportId(id);
                    setSubmitError('');
                    setSubmitSuccess('');
                  }}
                  disabled={isLoadingList || isSubmitting || targetReports.length === 0}
                />
              </div>
              <button
                type="button"
                onClick={() => loadReportsForEnv(targetEnv)}
                disabled={isLoadingList || isSubmitting}
                className="h-10 px-3 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shrink-0 disabled:opacity-50"
                title="Muat ulang daftar berkas"
              >
                {isLoadingList ? 'Memuat...' : 'Muat Ulang'}
              </button>
            </div>
            {listError && (
              <p className="text-xs text-rose-600">{listError}</p>
            )}
          </div>

          {/* Target Phase & Placement */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-800">3. Fase &amp; Penempatan Slot</label>

            <select
              value={targetPhaseKey}
              onChange={(e) => {
                setTargetPhaseKey(e.target.value as PhotoSlot['phaseKey']);
                setSelectedSlotId('');
                setSubmitError('');
                setSubmitSuccess('');
              }}
              disabled={isLoadingSlots || isSubmitting}
              className="w-full h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {PHASE_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>

            {targetPhaseKey !== 'general' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setMode('overwrite')}
                  className={`px-2.5 py-1.5 rounded border text-xs font-medium transition ${
                    effectiveMode === 'overwrite'
                      ? 'bg-slate-100 border-slate-900 text-slate-900'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Timpa Slot Dipilih
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setMode('insert')}
                  className={`px-2.5 py-1.5 rounded border text-xs font-medium transition ${
                    effectiveMode === 'insert'
                      ? 'bg-slate-100 border-slate-900 text-slate-900'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Sisipkan Kartu Baru
                </button>
              </div>
            )}

            {isLoadingSlots ? (
              <div className="text-xs text-slate-500 py-2">Memuat daftar slot berkas tujuan...</div>
            ) : slotsError ? (
              <div className="text-xs text-rose-600">{slotsError}</div>
            ) : effectiveMode === 'overwrite' ? (
              <select
                value={effectiveSelectedSlotId}
                onChange={(e) => setSelectedSlotId(e.target.value)}
                disabled={isSubmitting || phaseSlots.length === 0}
                className="w-full h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {phaseSlots.length === 0 ? (
                  <option value="">Tidak ada slot pada fase ini</option>
                ) : (
                  phaseSlots.map((slot, idx) => {
                    const statusText = slot.isUploaded ? 'Terisi' : 'Kosong';
                    const tag = slot.isCustom ? 'Tambahan • ' : '';
                    const shortCap = (slot.caption || slot.defaultCaption || slot.id).slice(0, 58);
                    return (
                      <option key={slot.id} value={slot.id}>
                        {idx + 1}. {shortCap} ({tag}{statusText})
                      </option>
                    );
                  })
                )}
              </select>
            ) : (
              <select
                value={effectiveInsertAfterId}
                onChange={(e) => setInsertAfterId(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="START">Di awal fase</option>
                {phaseSlots.map((slot, idx) => {
                  const shortCap = (slot.caption || slot.defaultCaption || slot.id).slice(0, 56);
                  return (
                    <option key={slot.id} value={slot.id}>
                      Setelah #{idx + 1}: {shortCap}
                    </option>
                  );
                })}
                <option value="END">Di akhir fase</option>
              </select>
            )}

            <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={includeDate}
                onChange={(e) => setIncludeDate(e.target.checked)}
                disabled={isSubmitting}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Sertakan tanggal foto ({sourceSlot.date || 'kosong'})</span>
            </label>
          </div>

          {submitError && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              {submitSuccess}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-3.5 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              {submitSuccess ? 'Tutup' : 'Batal'}
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                isLoadingList ||
                isLoadingSlots ||
                !targetReportId ||
                (effectiveMode === 'overwrite' && !effectiveSelectedSlotId) ||
                (!hasSourcePhoto && !sourceSlot.caption.trim())
              }
              className="px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-xs font-medium text-white shadow-sm transition"
            >
              {isSubmitting ? 'Menyalin...' : 'Salin ke Berkas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

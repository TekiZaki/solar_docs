// ---
// Summary:
// - Purpose: Synchronized report state ownership with unsaved-change guards for background refetch
// - Role: Application state hook
// - Depends on: src/types/schema.ts, src/lib/reportApi.ts, src/context/reportStateHelpers.ts
// - Key Responsibilities: Track dirty/revision/save-epoch/fetch-sequence, serialize saves, and guard refreshes
// - Notes: A ref is the single source of truth so async refreshes never overwrite newer local edits
// ---

import { useCallback, useRef, useState } from 'react';
import type { MaintenanceReportState } from '../types/schema';
import type { ReportSummary, SaveStatus } from './reportContextInstance';
import { saveReportState, fetchReportById } from '../lib/reportApi';
import {
  ACTIVE_REPORT_KEY, DEFAULT_REPORT_ID,
  createDefaultState, mergeStateWithSlots,
} from './reportStateHelpers';

export interface ReportSyncApi {
  state: MaintenanceReportState;
  currentReportId: string;
  saveStatus: SaveStatus;
  setSaveStatus: (status: SaveStatus) => void;
  lastSavedAt: string | null;
  hasUnsavedChanges: boolean;
  applyUpdate: (fn: (prev: MaintenanceReportState) => MaintenanceReportState) => void;
  replaceState: (next: MaintenanceReportState) => void;
  loadReport: (id: string) => Promise<boolean>;
  refreshCurrentReport: (options?: { force?: boolean }) => Promise<boolean>;
  saveReportNow: () => Promise<boolean>;
  persistNow: () => Promise<boolean>;
}

export function useReportSync(
  refreshReportList: () => Promise<ReportSummary[]>
): ReportSyncApi {
  const [currentReportId, setCurrentReportId] = useState<string>(
    () => localStorage.getItem(ACTIVE_REPORT_KEY) || DEFAULT_REPORT_ID
  );
  const [state, setState] = useState<MaintenanceReportState>(createDefaultState);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const stateRef = useRef<MaintenanceReportState>(state);
  const reportIdRef = useRef<string>(currentReportId);
  const dirtyRef = useRef(false);
  const revisionRef = useRef(0);
  const savingRef = useRef(false);
  const pendingSavesRef = useRef(0);
  const saveEpochRef = useRef(0);
  const fetchSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  // loads replace state without marking dirty and invalidate any in-flight fetch
  const replaceState = useCallback((next: MaintenanceReportState) => {
    abortRef.current?.abort();
    abortRef.current = null;
    fetchSeqRef.current += 1;
    stateRef.current = next;
    setState(next);
    dirtyRef.current = false;
  }, []);

  const applyUpdate = useCallback((fn: (prev: MaintenanceReportState) => MaintenanceReportState) => {
    const next = fn(stateRef.current);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setState(next);
    revisionRef.current += 1;
    dirtyRef.current = true;
    setSaveStatus('unsaved');
  }, []);

  const runSave = useCallback(async (): Promise<boolean> => {
    const snapshot = stateRef.current;
    const revisionAtStart = revisionRef.current;
    saveEpochRef.current += 1;
    setSaveStatus('saving');
    const ok = await saveReportState(reportIdRef.current, snapshot);
    if (ok) {
      if (revisionRef.current === revisionAtStart) {
        dirtyRef.current = false;
        setSaveStatus('saved');
      } else {
        setSaveStatus('unsaved');
      }
      setLastSavedAt(new Date().toLocaleTimeString('id-ID'));
      await refreshReportList();
      return true;
    }
    setSaveStatus('error');
    return false;
  }, [refreshReportList]);

  // saves are serialized so two POSTs can never land out of order
  const persistNow = useCallback((): Promise<boolean> => {
    pendingSavesRef.current += 1;
    savingRef.current = true;
    const run = saveQueueRef.current.then(() => runSave());
    const settle = () => {
      pendingSavesRef.current -= 1;
      if (pendingSavesRef.current === 0) savingRef.current = false;
    };
    saveQueueRef.current = run.then(settle, settle);
    return run;
  }, [runSave]);

  const refreshCurrentReport = useCallback(async (options?: { force?: boolean }): Promise<boolean> => {
    const force = options?.force === true;
    if (!force && (dirtyRef.current || savingRef.current)) return false;

    const seq = ++fetchSeqRef.current;
    const revision = revisionRef.current;
    const saveEpoch = saveEpochRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await fetchReportById(reportIdRef.current, controller.signal);
      if (seq !== fetchSeqRef.current) return false;
      if (revisionRef.current !== revision || saveEpochRef.current !== saveEpoch) return false;
      if (!data || typeof data !== 'object') return false;
      replaceState(mergeStateWithSlots(data));
      setSaveStatus('saved');
      setLastSavedAt(new Date().toLocaleTimeString('id-ID'));
      await refreshReportList();
      return true;
    } catch (err) {
      console.warn('Failed to refresh report data:', err);
      return false;
    }
  }, [refreshReportList, replaceState]);

  const loadReport = useCallback(async (id: string): Promise<boolean> => {
    try {
      const seq = ++fetchSeqRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const data = await fetchReportById(id, controller.signal);
      if (seq !== fetchSeqRef.current) return false;
      if (!data) throw new Error('Report not found');
      replaceState(mergeStateWithSlots(data));
      reportIdRef.current = id;
      setCurrentReportId(id);
      localStorage.setItem(ACTIVE_REPORT_KEY, id);
      setSaveStatus('saved');
      const list = await refreshReportList();
      const rep = list.find((r) => r.id === id);
      setLastSavedAt(rep?.updatedAt || null);
      return true;
    } catch (err) {
      console.error('Failed to load report:', err);
      setSaveStatus('error');
      return false;
    }
  }, [refreshReportList, replaceState]);

  return {
    state,
    currentReportId,
    saveStatus,
    setSaveStatus,
    lastSavedAt,
    hasUnsavedChanges: dirtyRef.current,
    applyUpdate,
    replaceState,
    loadReport,
    refreshCurrentReport,
    saveReportNow: persistNow,
    persistNow,
  };
}

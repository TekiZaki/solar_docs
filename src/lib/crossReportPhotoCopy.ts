// ---
// Summary:
// - Purpose: Cross-report and cross-environment (Lokal <-> Prod) PhotoCard copy helpers
// - Role: Infrastructure & domain service
// - Depends on: src/types/schema.ts, src/context/reportStateHelpers.ts, src/context/slotOperations.ts, src/lib/captionMeasurementSync.ts, src/lib/deviceIdentity.ts
// - Key Responsibilities: Resolve Lokal/Prod endpoints, read slot images as base64 data URLs, upload images, and save updated target report JSON
// ---

import type { MaintenanceReportState, PhotoSlot } from '../types/schema';
import type { ReportSummary } from '../context/reportContextInstance';
import { mergeStateWithSlots } from '../context/reportStateHelpers';
import { createNewCustomSlot, insertSlotInMap } from '../context/slotOperations';
import { applyCaptionToMeasurements } from './captionMeasurementSync';
import { getDeviceId } from './deviceIdentity';

export type TargetEnvironment = 'local' | 'prod';
export type CopyPlacementMode = 'overwrite' | 'insert';

export const DEFAULT_PROD_URL = 'https://tekizaki.my.id/projects/public/solar-docs/';
export const DEFAULT_LOCAL_URL = 'http://localhost:8000/';
export const DEFAULT_SYNC_KEY = 'solar-sync-2026';
export const LS_PROD_URL_KEY = 'solar_sync_prod_url';
export const LS_LOCAL_URL_KEY = 'solar_sync_local_url';
export const LS_SYNC_KEY = 'solar_sync_prod_key';
export const LS_CELL_CLIPBOARD_KEY = 'solar_copied_cell_token';
export const CELL_TOKEN_PREFIX = 'SOLAR_CELL:';

export function isRunningLocalHost(): boolean {
  if (import.meta.env.DEV) return true;
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  return /^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(host);
}

export function getCurrentEnvironment(): TargetEnvironment {
  return isRunningLocalHost() ? 'local' : 'prod';
}

export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return '';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

export function getSavedRemoteUrl(env: TargetEnvironment): string {
  try {
    const key = env === 'prod' ? LS_PROD_URL_KEY : LS_LOCAL_URL_KEY;
    const saved = window.localStorage.getItem(key);
    if (saved && /^https?:\/\//i.test(saved.trim())) {
      return normalizeBaseUrl(saved);
    }
  } catch {
    // ignore storage access errors
  }
  return env === 'prod' ? DEFAULT_PROD_URL : DEFAULT_LOCAL_URL;
}

export function saveRemoteUrl(env: TargetEnvironment, url: string): string {
  const normalized = normalizeBaseUrl(url);
  if (normalized) {
    try {
      const key = env === 'prod' ? LS_PROD_URL_KEY : LS_LOCAL_URL_KEY;
      window.localStorage.setItem(key, normalized);
    } catch {
      // ignore storage access errors
    }
  }
  return normalized;
}

export function resolveApiEndpoint(env: TargetEnvironment, remoteUrl?: string): string {
  if (env === getCurrentEnvironment()) {
    const base = import.meta.env.BASE_URL || '/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${normalizedBase}api/reports.php`;
  }
  const normalized = normalizeBaseUrl(remoteUrl || getSavedRemoteUrl(env));
  if (!normalized) {
    throw new Error(`URL server ${env === 'prod' ? 'Prod' : 'Lokal'} tidak valid.`);
  }
  return `${normalized}api/reports.php`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string' && reader.result.startsWith('data:image/')) {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca data gambar.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.readAsDataURL(blob);
  });
}

async function fetchLocalAssetAsDataUrl(relativePath: string, cacheBust?: number): Promise<string | null> {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const cleanRel = relativePath.replace(/^\/+/, '');
  const url = `${normalizedBase}${cleanRel}${cacheBust ? `?v=${cacheBust}` : `?_t=${Date.now()}`}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const blob = await res.blob();
  if (!blob.size) return null;
  return blobToDataUrl(blob);
}

export interface SourcePhotoPayload {
  renderedDataUrl: string | null;
  rawDataUrl: string | null;
  caption: string;
  date: string;
  panX?: number;
  panY?: number;
  isFitted?: boolean;
}

export async function readSourceSlotPayload(slot: PhotoSlot): Promise<SourcePhotoPayload> {
  let renderedDataUrl: string | null = null;
  if (slot.imageDataUrl && slot.imageDataUrl.startsWith('data:image/')) {
    renderedDataUrl = slot.imageDataUrl;
  } else if (slot.isUploaded && slot.imagePath) {
    renderedDataUrl = await fetchLocalAssetAsDataUrl(slot.imagePath, slot.updatedAt);
  }

  let rawDataUrl: string | null = null;
  if (slot.rawImageDataUrl && slot.rawImageDataUrl.startsWith('data:image/')) {
    rawDataUrl = slot.rawImageDataUrl;
  } else if (slot.isUploaded && slot.rawImagePath) {
    try {
      rawDataUrl = await fetchLocalAssetAsDataUrl(slot.rawImagePath, slot.updatedAt);
    } catch {
      rawDataUrl = null;
    }
  }

  return {
    renderedDataUrl,
    rawDataUrl,
    caption: slot.caption || '',
    date: slot.date || '',
    panX: slot.panX,
    panY: slot.panY,
    isFitted: slot.isFitted,
  };
}

export async function fetchReportListFromApi(apiEndpoint: string): Promise<ReportSummary[]> {
  const res = await fetch(`${apiEndpoint}?_t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Server merespons HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('Format daftar laporan tidak valid.');
  }
  return data as ReportSummary[];
}

export type RawReportRecord = Partial<MaintenanceReportState> & {
  id?: string;
  name?: string;
};

export async function fetchReportRecordFromApi(
  apiEndpoint: string,
  reportId: string
): Promise<RawReportRecord> {
  const res = await fetch(`${apiEndpoint}?id=${encodeURIComponent(reportId)}&_t=${Date.now()}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Gagal memuat laporan ${reportId} (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (!data || typeof data !== 'object') {
    throw new Error('Data laporan tidak valid.');
  }
  return data as RawReportRecord;
}

export async function uploadSlotImageToApi(
  apiEndpoint: string,
  reportId: string,
  slotId: string,
  imageData: string
): Promise<string> {
  const res = await fetch(`${apiEndpoint}?action=upload_image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportId, slotId, imageData }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success || !data?.imagePath) {
    throw new Error((data && typeof data.error === 'string' && data.error) || `Gagal mengunggah gambar ${slotId}.`);
  }
  return String(data.imagePath);
}

function sanitizeSlotsForApiSave(slots: Record<string, PhotoSlot>): Record<string, PhotoSlot> {
  const clean: Record<string, PhotoSlot> = {};
  for (const [id, slot] of Object.entries(slots)) {
    if (slot.imagePath) {
      clean[id] = {
        ...slot,
        imageDataUrl: undefined,
        rawImageDataUrl: undefined,
      };
    } else {
      clean[id] = slot;
    }
  }
  return clean;
}

export function buildUpdatedTargetState(
  baseState: MaintenanceReportState,
  params: {
    targetPhaseKey: PhotoSlot['phaseKey'];
    mode: CopyPlacementMode;
    targetSlotId: string;
    insertAfterSlotId?: string | 'START';
    customSlotId?: string;
    caption: string;
    includeDate: boolean;
    sourceDate: string;
    imagePath?: string;
    rawImagePath?: string;
    imageDataUrl?: string;
    rawImageDataUrl?: string;
    hasPhoto: boolean;
    panX?: number;
    panY?: number;
    isFitted?: boolean;
    now: number;
  }
): { nextState: MaintenanceReportState; finalSlotId: string } {
  const {
    targetPhaseKey,
    mode,
    targetSlotId,
    insertAfterSlotId,
    customSlotId,
    caption,
    includeDate,
    sourceDate,
    imagePath,
    rawImagePath,
    imageDataUrl,
    rawImageDataUrl,
    hasPhoto,
    panX,
    panY,
    isFitted,
    now,
  } = params;

  let nextPhotoSlots: Record<string, PhotoSlot>;
  let finalSlotId: string;
  let targetExcludeFromDocx = false;

  if (mode === 'insert') {
    const newSlot = createNewCustomSlot(targetPhaseKey, baseState.realizationDates, caption);
    finalSlotId = customSlotId || newSlot.id;
    const populatedSlot: PhotoSlot = {
      ...newSlot,
      id: finalSlotId,
      rId: `rId_${finalSlotId}`,
      caption,
      date: includeDate && sourceDate ? sourceDate : newSlot.date,
      ...(hasPhoto && (imagePath || imageDataUrl)
        ? {
            imageDataUrl,
            rawImageDataUrl,
            imagePath,
            rawImagePath: rawImagePath || undefined,
            panX: panX ?? 0,
            panY: panY ?? 0,
            isFitted: isFitted ?? false,
            isUploaded: true,
            updatedAt: now,
          }
        : {}),
    };
    nextPhotoSlots = insertSlotInMap(baseState.photoSlots, populatedSlot, insertAfterSlotId);
  } else {
    const existing = baseState.photoSlots[targetSlotId];
    if (!existing) {
      throw new Error(`Slot tujuan ${targetSlotId} tidak ditemukan.`);
    }
    finalSlotId = targetSlotId;
    targetExcludeFromDocx = Boolean(existing.excludeFromDocx);
    const updatedSlot: PhotoSlot = {
      ...existing,
      caption,
      ...(includeDate && sourceDate ? { date: sourceDate } : {}),
      ...(hasPhoto && (imagePath || imageDataUrl)
        ? {
            imageDataUrl,
            rawImageDataUrl,
            imagePath,
            rawImagePath: rawImagePath || undefined,
            panX: panX ?? 0,
            panY: panY ?? 0,
            isFitted: isFitted ?? false,
            isUploaded: true,
            updatedAt: now,
          }
        : {}),
    };
    nextPhotoSlots = {
      ...baseState.photoSlots,
      [targetSlotId]: updatedSlot,
    };
  }

  const nextMeasurements =
    !targetExcludeFromDocx && caption
      ? applyCaptionToMeasurements(baseState.measurements, targetPhaseKey, caption)
      : baseState.measurements;

  return {
    finalSlotId,
    nextState: {
      ...baseState,
      photoSlots: nextPhotoSlots,
      measurements: nextMeasurements,
    },
  };
}

export async function copyPhotoSlotToRemoteReport(params: {
  apiEndpoint: string;
  targetReportId: string;
  targetPhaseKey: PhotoSlot['phaseKey'];
  mode: CopyPlacementMode;
  targetSlotId: string;
  insertAfterSlotId?: string | 'START';
  includeDate: boolean;
  sourcePayload: SourcePhotoPayload;
}): Promise<{ finalSlotId: string }> {
  const {
    apiEndpoint,
    targetReportId,
    targetPhaseKey,
    mode,
    targetSlotId,
    insertAfterSlotId,
    includeDate,
    sourcePayload,
  } = params;

  const rawRecord = await fetchReportRecordFromApi(apiEndpoint, targetReportId);
  const mergedState = mergeStateWithSlots({ ...rawRecord, id: targetReportId });
  const now = Date.now();
  const effectiveSlotId = mode === 'insert' ? `slot_custom_${now}` : targetSlotId;

  let uploadedImagePath: string | undefined;
  let uploadedRawImagePath: string | undefined;
  const hasPhoto = Boolean(sourcePayload.renderedDataUrl);

  if (sourcePayload.renderedDataUrl) {
    uploadedImagePath = await uploadSlotImageToApi(
      apiEndpoint,
      targetReportId,
      effectiveSlotId,
      sourcePayload.renderedDataUrl
    );
    if (sourcePayload.rawDataUrl) {
      try {
        uploadedRawImagePath = await uploadSlotImageToApi(
          apiEndpoint,
          targetReportId,
          `${effectiveSlotId}_raw`,
          sourcePayload.rawDataUrl
        );
      } catch {
        uploadedRawImagePath = undefined;
      }
    }
  }

  const built = buildUpdatedTargetState(mergedState, {
    targetPhaseKey,
    mode,
    targetSlotId,
    insertAfterSlotId,
    customSlotId: mode === 'insert' ? effectiveSlotId : undefined,
    caption: sourcePayload.caption,
    includeDate,
    sourceDate: sourcePayload.date,
    imagePath: uploadedImagePath,
    rawImagePath: uploadedRawImagePath,
    hasPhoto,
    panX: sourcePayload.panX,
    panY: sourcePayload.panY,
    isFitted: sourcePayload.isFitted,
    now,
  });

  const stateToSave: MaintenanceReportState = {
    ...built.nextState,
    photoSlots: sanitizeSlotsForApiSave(built.nextState.photoSlots),
  };

  const saveRes = await fetch(apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: targetReportId,
      name: rawRecord.name || targetReportId.replace(/_/g, ' '),
      deviceId: getDeviceId(),
      state: stateToSave,
    }),
  });

  const saveData = await saveRes.json().catch(() => null);
  if (!saveRes.ok || !saveData?.success) {
    throw new Error(
      (saveData && typeof saveData.error === 'string' && saveData.error) ||
        `Gagal menyimpan laporan tujuan (HTTP ${saveRes.status}).`
    );
  }

  return { finalSlotId: built.finalSlotId };
}

export interface CopiedPhotoCellToken {
  v: 1;
  env: TargetEnvironment;
  api: string;
  reportId: string;
  slotId: string;
  caption: string;
  date: string;
  panX?: number;
  panY?: number;
  isFitted?: boolean;
  imagePath?: string;
  rawImagePath?: string;
  updatedAt?: number;
  copiedAt: number;
}

export function getSavedSyncKey(): string {
  try {
    const saved = window.localStorage.getItem(LS_SYNC_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // ignore storage errors
  }
  return DEFAULT_SYNC_KEY;
}

export function getAbsoluteCurrentApiEndpoint(): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${window.location.origin}${normalizedBase}api/reports.php`;
}

export function buildPhotoCellTokenString(reportId: string, slot: PhotoSlot): string {
  const token: CopiedPhotoCellToken = {
    v: 1,
    env: getCurrentEnvironment(),
    api: getAbsoluteCurrentApiEndpoint(),
    reportId,
    slotId: slot.id,
    caption: slot.caption || '',
    date: slot.date || '',
    panX: slot.panX,
    panY: slot.panY,
    isFitted: slot.isFitted,
    imagePath: slot.isUploaded ? slot.imagePath : undefined,
    rawImagePath: slot.isUploaded ? slot.rawImagePath : undefined,
    updatedAt: slot.updatedAt,
    copiedAt: Date.now(),
  };
  return `${CELL_TOKEN_PREFIX}${JSON.stringify(token)}`;
}

export function parsePhotoCellTokenString(raw: string): CopiedPhotoCellToken | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(CELL_TOKEN_PREFIX)) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(CELL_TOKEN_PREFIX.length)) as Partial<CopiedPhotoCellToken>;
    if (!parsed || parsed.v !== 1 || !parsed.reportId || !parsed.slotId || !parsed.api) {
      return null;
    }
    return {
      v: 1,
      env: parsed.env === 'prod' ? 'prod' : 'local',
      api: String(parsed.api),
      reportId: String(parsed.reportId),
      slotId: String(parsed.slotId),
      caption: typeof parsed.caption === 'string' ? parsed.caption : '',
      date: typeof parsed.date === 'string' ? parsed.date : '',
      panX: typeof parsed.panX === 'number' ? parsed.panX : undefined,
      panY: typeof parsed.panY === 'number' ? parsed.panY : undefined,
      isFitted: typeof parsed.isFitted === 'boolean' ? parsed.isFitted : undefined,
      imagePath: typeof parsed.imagePath === 'string' ? parsed.imagePath : undefined,
      rawImagePath: typeof parsed.rawImagePath === 'string' ? parsed.rawImagePath : undefined,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : undefined,
      copiedAt: typeof parsed.copiedAt === 'number' ? parsed.copiedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export async function copyPhotoCellToClipboard(reportId: string, slot: PhotoSlot): Promise<{ viaClipboard: boolean }> {
  const tokenStr = buildPhotoCellTokenString(reportId, slot);
  try {
    window.localStorage.setItem(LS_CELL_CLIPBOARD_KEY, tokenStr);
  } catch {
    // ignore storage quota/privacy errors
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(tokenStr);
      return { viaClipboard: true };
    } catch {
      return { viaClipboard: false };
    }
  }
  return { viaClipboard: false };
}

export async function resolvePhotoCellTokenForPaste(): Promise<CopiedPhotoCellToken | null> {
  let clipboardReadSupported = false;
  if (navigator.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      clipboardReadSupported = true;
      const fromClip = parsePhotoCellTokenString(text);
      if (fromClip) return fromClip;
    } catch {
      // fall back to localStorage or manual prompt
    }
  }

  try {
    const saved = window.localStorage.getItem(LS_CELL_CLIPBOARD_KEY);
    if (saved) {
      const fromStorage = parsePhotoCellTokenString(saved);
      if (fromStorage) return fromStorage;
    }
  } catch {
    // ignore storage errors
  }

  if (clipboardReadSupported) {
    throw new Error('Clipboard belum berisi sel yang disalin. Klik "Salin Sel" dulu.');
  }

  const manual = window.prompt('Tempel token SOLAR_CELL dari kartu yang disalin:');
  if (!manual) return null;
  const parsedManual = parsePhotoCellTokenString(manual);
  if (!parsedManual) {
    throw new Error('Token clipboard tidak valid (harus diawali SOLAR_CELL:).');
  }
  return parsedManual;
}

async function fetchRemoteSyncImageAsDataUrl(
  token: CopiedPhotoCellToken,
  filePath: string
): Promise<string | null> {
  const fileName = filePath.split('/').pop();
  if (!fileName) return null;

  const syncKey = getSavedSyncKey();
  const buildUrl = (apiBase: string) =>
    `${apiBase}?action=sync_file&type=image&reportId=${encodeURIComponent(token.reportId)}&file=${encodeURIComponent(fileName)}&syncKey=${encodeURIComponent(syncKey)}&_t=${Date.now()}`;

  const tryFetch = async (apiBase: string): Promise<Response> => {
    return fetch(buildUrl(apiBase), { cache: 'no-store' });
  };

  let res: Response;
  try {
    res = await tryFetch(token.api);
  } catch (err) {
    // Fallback to direct PHP server port if local Vite dev server was closed
    if (token.env === 'local' && !token.api.startsWith(DEFAULT_LOCAL_URL)) {
      res = await tryFetch(`${DEFAULT_LOCAL_URL}api/reports.php`);
    } else {
      throw err;
    }
  }

  if (res.status === 403) {
    throw new Error('Sync key ditolak oleh server sumber (403).');
  }
  if (!res.ok) return null;
  const blob = await res.blob();
  if (!blob.size) return null;
  return blobToDataUrl(blob);
}

export async function fetchSourcePayloadFromCellToken(
  token: CopiedPhotoCellToken
): Promise<SourcePhotoPayload> {
  const isSameServer = token.api === getAbsoluteCurrentApiEndpoint();

  let renderedDataUrl: string | null = null;
  if (token.imagePath) {
    renderedDataUrl = isSameServer
      ? await fetchLocalAssetAsDataUrl(token.imagePath, token.updatedAt)
      : await fetchRemoteSyncImageAsDataUrl(token, token.imagePath);
  }

  let rawDataUrl: string | null = null;
  if (token.rawImagePath) {
    try {
      rawDataUrl = isSameServer
        ? await fetchLocalAssetAsDataUrl(token.rawImagePath, token.updatedAt)
        : await fetchRemoteSyncImageAsDataUrl(token, token.rawImagePath);
    } catch {
      rawDataUrl = null;
    }
  }

  if (token.imagePath && !renderedDataUrl) {
    throw new Error(`Gambar sumber (${token.reportId}/${token.slotId}) tidak ditemukan atau gagal diunduh.`);
  }

  return {
    renderedDataUrl,
    rawDataUrl,
    caption: token.caption,
    date: token.date,
    panX: token.panX,
    panY: token.panY,
    isFitted: token.isFitted,
  };
}

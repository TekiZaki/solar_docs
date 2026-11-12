// ---
// Summary:
// - Purpose: Client-side HTTP API adapter for report persistence, discrete image uploads, and migrations
// - Role: Infrastructure API client
// - Depends on: src/types/schema.ts
// - Key Responsibilities: Communicate with PHP backend, upload/delete discrete image files, strip binary bloat before saving JSON
// - Notes: Decouples binary image transmission from document state saves
// ---

import type { MaintenanceReportState } from '../types/schema';
import type { ReportSummary } from '../context/reportContextInstance';

const API_ENDPOINT = `${import.meta.env.BASE_URL}api/reports.php`;

export async function uploadSlotImage(
  reportId: string,
  slotId: string,
  imageData: string
): Promise<string | null> {
  if (!imageData || typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
    console.warn(`uploadSlotImage aborted: invalid image data for slot ${slotId}`);
    return null;
  }
  try {
    const res = await fetch(`${API_ENDPOINT}?action=upload_image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, slotId, imageData }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success && data.imagePath ? (data.imagePath as string) : null;
  } catch (err) {
    console.error('Upload slot image failed:', err);
    return null;
  }
}

export async function deleteSlotImage(reportId: string, slotId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_ENDPOINT}?action=delete_image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, slotId }),
    });
    return res.ok;
  } catch (err) {
    console.error('Delete slot image failed:', err);
    return false;
  }
}

export async function migrateReportImages(
  reportId: string
): Promise<{ success: boolean; convertedCount: number; newSizeBytes?: number }> {
  try {
    const res = await fetch(`${API_ENDPOINT}?action=migrate_images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reportId }),
    });
    if (!res.ok) return { success: false, convertedCount: 0 };
    const data = await res.json();
    return {
      success: Boolean(data.success),
      convertedCount: Number(data.convertedCount || 0),
      newSizeBytes: data.newSizeBytes ? Number(data.newSizeBytes) : undefined,
    };
  } catch (err) {
    console.error('Migrate report images failed:', err);
    return { success: false, convertedCount: 0 };
  }
}

export async function fetchReportList(): Promise<ReportSummary[]> {
  try {
    const res = await fetch(`${API_ENDPOINT}?_t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const list = await res.json();
    return Array.isArray(list) ? (list as ReportSummary[]) : [];
  } catch (e) {
    console.warn('Failed to load report list:', e);
    return [];
  }
}

export async function fetchReportById(id: string, signal?: AbortSignal): Promise<any | null> {
  try {
    const res = await fetch(`${API_ENDPOINT}?id=${encodeURIComponent(id)}&_t=${Date.now()}`, {
      cache: 'no-store',
      signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    if (signal?.aborted || (e instanceof DOMException && e.name === 'AbortError')) return null;
    console.warn('Fetch report failed:', e);
    return null;
  }
}

export async function createReportOnServer(
  name: string,
  lokasi?: string,
  state?: MaintenanceReportState
): Promise<string | null> {
  try {
    const res = await fetch(`${API_ENDPOINT}?action=create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, lokasi, state }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id ? (data.id as string) : null;
  } catch (err) {
    console.error('Failed to create report:', err);
    return null;
  }
}

function sanitizeStateForSave(reportState: MaintenanceReportState): MaintenanceReportState {
  const cleanSlots: typeof reportState.photoSlots = {};
  for (const [id, slot] of Object.entries(reportState.photoSlots)) {
    // If the slot has an imagePath on the server, strip out rawImageDataUrl and imageDataUrl
    if (slot.imagePath) {
      cleanSlots[id] = {
        ...slot,
        imageDataUrl: undefined,
        rawImageDataUrl: undefined,
      };
    } else {
      cleanSlots[id] = slot;
    }
  }

  return {
    ...reportState,
    photoSlots: cleanSlots,
  };
}

export async function saveReportState(
  id: string,
  reportState: MaintenanceReportState
): Promise<boolean> {
  try {
    const sanitizedState = sanitizeStateForSave(reportState);
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        name: id.replace(/_/g, ' '),
        state: sanitizedState,
      }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.error('Save to backend failed:', err);
    return false;
  }
}

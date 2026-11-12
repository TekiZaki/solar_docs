// ---
// Summary:
// - Purpose: Photo slot image actions with reliable autosave to the server
// - Role: Application action hook
// - Depends on: src/types/schema.ts, src/lib/imageUtils.ts, src/lib/reportApi.ts
// - Key Responsibilities: Upload, replace, and remove slot images through applyUpdate then persistNow
// - Notes: applyUpdate runs synchronously, so the autosave always sees the state it just wrote
// ---

import type { MaintenanceReportState } from '../types/schema';
import { cropOrFitTo34, downsampleRawImage } from '../lib/imageUtils';
import { uploadSlotImage, deleteSlotImage } from '../lib/reportApi';

interface PhotoSlotActionsDeps {
  currentReportId: string;
  applyUpdate: (fn: (prev: MaintenanceReportState) => MaintenanceReportState) => void;
  persistNow: () => Promise<boolean>;
}

export interface PhotoSlotActions {
  setPhotoSlotImage: (slotId: string, file: File) => Promise<void>;
  setPhotoSlotDataUrl: (
    slotId: string,
    rendered34DataUrl: string,
    rawSourceDataUrl?: string,
    adjustment?: { isFitted?: boolean; panX?: number; panY?: number }
  ) => Promise<void>;
  removePhotoSlotImage: (slotId: string) => Promise<void>;
}

export function usePhotoSlotActions(deps: PhotoSlotActionsDeps): PhotoSlotActions {
  const { currentReportId, applyUpdate, persistNow } = deps;

  const setPhotoSlotImage = async (slotId: string, file: File): Promise<void> => {
    const rawDataUrl = await downsampleRawImage(file, 1200);
    const rendered34 = await cropOrFitTo34(rawDataUrl, {
      isFitted: false,
      panX: 0,
      panY: 0,
    });
    const [serverPath, rawServerPath] = await Promise.all([
      uploadSlotImage(currentReportId, slotId, rendered34),
      uploadSlotImage(currentReportId, `${slotId}_raw`, rawDataUrl),
    ]);

    applyUpdate((prev) => {
      const slot = prev.photoSlots[slotId];
      if (!slot) return prev;
      return {
        ...prev,
        photoSlots: {
          ...prev.photoSlots,
          [slotId]: {
            ...slot,
            imageDataUrl: rendered34,
            rawImageDataUrl: rawDataUrl,
            imagePath: serverPath || slot.imagePath,
            rawImagePath: rawServerPath || slot.rawImagePath,
            panX: 0,
            panY: 0,
            isFitted: false,
            isUploaded: true,
            updatedAt: Date.now(),
          },
        },
      };
    });

    await persistNow();
  };

  const setPhotoSlotDataUrl = async (
    slotId: string,
    rendered34DataUrl: string,
    rawSourceDataUrl?: string,
    adjustment?: { isFitted?: boolean; panX?: number; panY?: number }
  ): Promise<void> => {
    const isNewRawDataUrl =
      typeof rawSourceDataUrl === 'string' && rawSourceDataUrl.startsWith('data:image/');
    const now = Date.now();

    const [serverPath, rawServerPath] = await Promise.all([
      rendered34DataUrl && rendered34DataUrl.startsWith('data:image/')
        ? uploadSlotImage(currentReportId, slotId, rendered34DataUrl)
        : Promise.resolve(null),
      isNewRawDataUrl
        ? uploadSlotImage(currentReportId, `${slotId}_raw`, rawSourceDataUrl!)
        : Promise.resolve(null),
    ]);

    applyUpdate((prev) => {
      const slot = prev.photoSlots[slotId];
      if (!slot) return prev;
      return {
        ...prev,
        photoSlots: {
          ...prev.photoSlots,
          [slotId]: {
            ...slot,
            imageDataUrl: rendered34DataUrl,
            rawImageDataUrl: isNewRawDataUrl ? rawSourceDataUrl : slot.rawImageDataUrl,
            imagePath: serverPath || slot.imagePath,
            rawImagePath: rawServerPath || slot.rawImagePath,
            panX: adjustment?.panX ?? slot.panX ?? 0,
            panY: adjustment?.panY ?? slot.panY ?? 0,
            isFitted: adjustment?.isFitted ?? slot.isFitted ?? false,
            isUploaded: true,
            updatedAt: now,
          },
        },
      };
    });

    await persistNow();
  };

  const removePhotoSlotImage = async (slotId: string): Promise<void> => {
    deleteSlotImage(currentReportId, slotId);
    deleteSlotImage(currentReportId, `${slotId}_raw`);

    applyUpdate((prev) => {
      const slot = prev.photoSlots[slotId];
      if (!slot) return prev;
      return {
        ...prev,
        photoSlots: {
          ...prev.photoSlots,
          [slotId]: {
            ...slot,
            imageDataUrl: undefined,
            rawImageDataUrl: undefined,
            imagePath: undefined,
            rawImagePath: undefined,
            panX: undefined,
            panY: undefined,
            isFitted: undefined,
            isUploaded: false,
            updatedAt: Date.now(),
          },
        },
      };
    });

    await persistNow();
  };

  return { setPhotoSlotImage, setPhotoSlotDataUrl, removePhotoSlotImage };
}

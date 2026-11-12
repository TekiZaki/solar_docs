// ---
// Summary:
// - Purpose: Global state management and disk persistence for solar maintenance reports
// - Role: Application Context Provider
// - Depends on: src/context/useReportSync.ts, src/context/usePhotoSlotActions.ts, src/context/reportStateHelpers.ts, src/lib/reportApi.ts
// - Key Responsibilities: Wire report mutators to applyUpdate, delegate sync/save guards to useReportSync, manage report list
// - Notes: Every user mutation goes through applyUpdate so background refetch can never overwrite local edits
// ---

import React, { useState, useEffect, useCallback } from 'react';
import type {
  MaintenanceReportState, LocationInfo, RealizationDate, PhotoSlot,
  ChecklistItem, ElectricalMeasurement, PVDatasheet, STCDataRow,
  DamageItem, TechnicalRecommendationItem, RecommendationItem,
} from '../types/schema';
import { DEFAULT_LOCATION, DEFAULT_REALIZATION_DATES } from '../constants/defaultData';
import { calculateSTCDeviation } from '../lib/calculations';
import {
  saveReportState, deleteSlotImage,
  migrateReportImages, fetchReportList, createReportOnServer,
} from '../lib/reportApi';
import {
  insertMeasurementInList, addMeasurementToList,
  deleteMeasurementFromList, updateMeasurementInList,
} from './measurementOperations';
import { createNewCustomSlot, insertSlotInMap, moveSlotInMap } from './slotOperations';
import { createDefaultState } from './reportStateHelpers';
import { useReportSync } from './useReportSync';
import { usePhotoSlotActions } from './usePhotoSlotActions';
import { ReportContext, type ReportSummary } from './reportContextInstance';

export const ReportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reportList, setReportList] = useState<ReportSummary[]>([]);

  const refreshReportList = useCallback(async (): Promise<ReportSummary[]> => {
    const list = await fetchReportList();
    setReportList(list);
    return list;
  }, []);

  const {
    state, currentReportId, saveStatus, setSaveStatus, lastSavedAt, hasUnsavedChanges,
    applyUpdate, replaceState, loadReport, refreshCurrentReport, saveReportNow, persistNow,
  } = useReportSync(refreshReportList);

  const { setPhotoSlotImage, setPhotoSlotDataUrl, removePhotoSlotImage } = usePhotoSlotActions({
    currentReportId,
    applyUpdate,
    persistNow,
  });

  // Initial load
  useEffect(() => {
    refreshCurrentReport();
  }, [refreshCurrentReport]);

  const createReport = async (name: string, lokasi?: string): Promise<string | null> => {
    try {
      setSaveStatus('saving');
      const freshState: MaintenanceReportState = {
        ...createDefaultState(),
        location: {
          ...DEFAULT_LOCATION,
          lokasi: lokasi || '',
        },
        realizationDates: DEFAULT_REALIZATION_DATES.map((r) => ({
          ...r,
          tanggalPelaksanaan: '',
          kondisiCuaca: '',
        })),
      };
      const id = await createReportOnServer(name, lokasi, freshState);
      if (id) {
        await refreshReportList();
        await loadReport(id);
        return id;
      }
      setSaveStatus('error');
      return null;
    } catch (err) {
      console.error('Failed to create report:', err);
      setSaveStatus('error');
      return null;
    }
  };

  const updateLocation = (fields: Partial<LocationInfo>) => {
    applyUpdate((prev) => ({
      ...prev,
      location: { ...prev.location, ...fields },
    }));
  };

  const updateRealizationDate = (index: number, fields: Partial<RealizationDate>) => {
    applyUpdate((prev) => {
      const updated = [...prev.realizationDates];
      if (updated[index]) {
        updated[index] = { ...updated[index], ...fields };
      }
      return { ...prev, realizationDates: updated };
    });
  };

  const updatePhotoSlot = (slotId: string, fields: Partial<PhotoSlot>) => {
    applyUpdate((prev) => {
      const slot = prev.photoSlots[slotId];
      if (!slot) return prev;
      return {
        ...prev,
        photoSlots: {
          ...prev.photoSlots,
          [slotId]: { ...slot, ...fields },
        },
      };
    });
  };

  const setPhasePhotosDate = (phaseKey: string, date: string) => {
    applyUpdate((prev) => {
      const updatedSlots = { ...prev.photoSlots };
      for (const [id, slot] of Object.entries(updatedSlots)) {
        if (slot.phaseKey === phaseKey) {
          updatedSlots[id] = { ...slot, date };
        }
      }
      return { ...prev, photoSlots: updatedSlots };
    });
  };

  const updateChecklistItem = (id: string, fields: Partial<ChecklistItem>) => {
    applyUpdate((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item) => (item.id === id ? { ...item, ...fields } : item)),
    }));
  };

  const updateMeasurement = (id: string, fields: Partial<ElectricalMeasurement>) => {
    applyUpdate((prev) => ({
      ...prev,
      measurements: updateMeasurementInList(prev.measurements, id, fields),
    }));
  };

  const insertMeasurement = (
    targetId: string,
    position: 'before' | 'after',
    initialData?: Partial<ElectricalMeasurement>
  ) => {
    applyUpdate((prev) => ({
      ...prev,
      measurements: insertMeasurementInList(prev.measurements, targetId, position, initialData),
    }));
  };

  const addMeasurement = (
    group: 'dc_vmp' | 'dc_imp' | 'dc_voc' | 'dc' | 'ac' | 'ground',
    position: 'START' | 'END' = 'END',
    initialData?: Partial<ElectricalMeasurement>
  ) => {
    applyUpdate((prev) => ({
      ...prev,
      measurements: addMeasurementToList(prev.measurements, group, position, initialData),
    }));
  };

  const deleteMeasurement = (id: string) => {
    applyUpdate((prev) => ({
      ...prev,
      measurements: deleteMeasurementFromList(prev.measurements, id),
    }));
  };

  const updateDatasheet = (fields: Partial<PVDatasheet>) => {
    applyUpdate((prev) => ({
      ...prev,
      datasheet: { ...prev.datasheet, ...fields },
    }));
  };

  const updateSTCRow = (stringIndex: number, rowIndex: number, fields: Partial<STCDataRow>) => {
    applyUpdate((prev) => {
      const updatedStrings = [...prev.stcStrings];
      const targetString = updatedStrings[stringIndex];
      if (!targetString) return prev;

      const updatedRows = [...targetString.rows];
      const targetRow = updatedRows[rowIndex];
      if (!targetRow) return prev;

      const mergedRow = { ...targetRow, ...fields };
      if (fields.stc !== undefined || fields.meas !== undefined) {
        mergedRow.hasilAnalisa = calculateSTCDeviation(mergedRow.stc, mergedRow.meas);
      }

      updatedRows[rowIndex] = mergedRow;
      updatedStrings[stringIndex] = { ...targetString, rows: updatedRows };

      return {
        ...prev,
        stcStrings: updatedStrings,
      };
    });
  };

  const updateConclusions = (fields: Partial<MaintenanceReportState['conclusions']>) => {
    applyUpdate((prev) => ({
      ...prev,
      conclusions: { ...prev.conclusions, ...fields },
    }));
  };

  const addDamage = () => {
    applyUpdate((prev) => {
      const newId = `dmg_${Date.now()}`;
      const nextNo = (prev.damages.length + 1).toString();
      const newItem: DamageItem = {
        id: newId,
        no: nextNo,
        lokasi: prev.location.lokasi || '',
        kerusakanDiLokasi: '',
        perbaikanYangDilakukan: '',
        updateKerusakan: '',
      };
      return { ...prev, damages: [...prev.damages, newItem] };
    });
  };

  const updateDamage = (id: string, fields: Partial<DamageItem>) => {
    applyUpdate((prev) => ({
      ...prev,
      damages: prev.damages.map((d) => (d.id === id ? { ...d, ...fields } : d)),
    }));
  };

  const deleteDamage = (id: string) => {
    applyUpdate((prev) => ({
      ...prev,
      damages: prev.damages.filter((d) => d.id !== id),
    }));
  };

  const setDamages = (damages: DamageItem[]) => {
    applyUpdate((prev) => ({
      ...prev,
      damages,
    }));
  };

  const addTechnicalRecommendation = () => {
    applyUpdate((prev) => {
      const current = prev.technicalRecommendations || [];
      const newId = `tech_rec_${Date.now()}`;
      const nextNo = (current.length + 1).toString();
      const newItem: TechnicalRecommendationItem = {
        id: newId,
        no: nextNo,
        parameterTemuan: '',
        rekomendasiTeknis: '',
      };
      return { ...prev, technicalRecommendations: [...current, newItem] };
    });
  };

  const updateTechnicalRecommendation = (
    id: string,
    fields: Partial<TechnicalRecommendationItem>
  ) => {
    applyUpdate((prev) => ({
      ...prev,
      technicalRecommendations: (prev.technicalRecommendations || []).map((r) =>
        r.id === id ? { ...r, ...fields } : r
      ),
    }));
  };

  const deleteTechnicalRecommendation = (id: string) => {
    applyUpdate((prev) => ({
      ...prev,
      technicalRecommendations: (prev.technicalRecommendations || []).filter((r) => r.id !== id),
    }));
  };

  const setTechnicalRecommendations = (items: TechnicalRecommendationItem[]) => {
    applyUpdate((prev) => ({
      ...prev,
      technicalRecommendations: items,
    }));
  };

  const addRecommendation = () => {
    applyUpdate((prev) => {
      const newId = `rec_${Date.now()}`;
      const nextNo = (prev.recommendations.length + 1).toString();
      const newItem: RecommendationItem = {
        id: newId,
        no: nextNo,
        lokasi: prev.location.lokasi || '',
        kerusakanDiLokasi: '',
        updateKerusakan: '',
        rekomendasi: '',
      };
      return { ...prev, recommendations: [...prev.recommendations, newItem] };
    });
  };

  const updateRecommendation = (id: string, fields: Partial<RecommendationItem>) => {
    applyUpdate((prev) => ({
      ...prev,
      recommendations: prev.recommendations.map((r) => (r.id === id ? { ...r, ...fields } : r)),
    }));
  };

  const deleteRecommendation = (id: string) => {
    applyUpdate((prev) => ({
      ...prev,
      recommendations: prev.recommendations.filter((r) => r.id !== id),
    }));
  };

  const setHidePVAnalisis = (hide: boolean) => {
    applyUpdate((prev) => ({ ...prev, hidePVAnalisis: hide }));
  };

  const setCustomFileName = (fileName: string) => {
    applyUpdate((prev) => ({ ...prev, customFileName: fileName }));
  };

  const addPhotoSlot = (
    phaseKey: PhotoSlot['phaseKey'],
    caption?: string,
    insertAfterSlotId?: string | 'START'
  ) => {
    applyUpdate((prev) => ({
      ...prev,
      photoSlots: insertSlotInMap(
        prev.photoSlots,
        createNewCustomSlot(phaseKey, prev.realizationDates, caption),
        insertAfterSlotId
      ),
    }));
  };

  const movePhotoSlot = (slotId: string, direction: 'prev' | 'next') => {
    applyUpdate((prev) => ({
      ...prev,
      photoSlots: moveSlotInMap(prev.photoSlots, slotId, direction),
    }));
  };

  const deletePhotoSlot = (slotId: string) => {
    deleteSlotImage(currentReportId, slotId);
    deleteSlotImage(currentReportId, `${slotId}_raw`);
    applyUpdate((prev) => {
      const nextSlots = { ...prev.photoSlots };
      delete nextSlots[slotId];
      return {
        ...prev,
        photoSlots: nextSlots,
      };
    });
  };

  const migrateImages = async () => {
    const res = await migrateReportImages(currentReportId);
    if (res.success) {
      await loadReport(currentReportId);
      await refreshReportList();
    }
    return res;
  };

  const resetAll = async (targetId?: string): Promise<boolean> => {
    const idToReset = targetId || currentReportId;
    const fresh = createDefaultState();

    const existing = reportList.find((r) => r.id === idToReset);
    if (existing) {
      fresh.location.lokasi = existing.lokasi || '';
    }

    if (idToReset === currentReportId) {
      // saved right away below, so use the non-dirty load path to avoid a false unsaved flag
      replaceState(fresh);
      return persistNow();
    }

    const ok = await saveReportState(idToReset, fresh);
    await refreshReportList();
    return ok;
  };

  return (
    <ReportContext.Provider
      value={{
        state,
        currentReportId,
        reportList,
        saveStatus,
        lastSavedAt,
        hasUnsavedChanges,
        loadReport,
        refreshCurrentReport,
        saveReportNow,
        createReport,
        refreshReportList,
        updateLocation,
        updateRealizationDate,
        updatePhotoSlot,
        setPhasePhotosDate,
        setPhotoSlotImage,
        setPhotoSlotDataUrl,
        removePhotoSlotImage,
        updateChecklistItem,
        updateMeasurement,
        insertMeasurement,
        addMeasurement,
        deleteMeasurement,
        updateDatasheet,
        updateSTCRow,
        updateConclusions,
        addDamage,
        updateDamage,
        deleteDamage, setDamages, addTechnicalRecommendation, updateTechnicalRecommendation, deleteTechnicalRecommendation, setTechnicalRecommendations,
        addRecommendation,
        updateRecommendation,
        deleteRecommendation,
        setHidePVAnalisis,
        setCustomFileName,
        addPhotoSlot,
        movePhotoSlot,
        deletePhotoSlot,
        migrateImages,
        resetAll,
      }}
    >
      {children}
    </ReportContext.Provider>
  );
};

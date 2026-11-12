// ---
// Summary:
// - Purpose: React context instance definition for solar report state and disk file persistence
// - Role: Infrastructure / Context instance
// - Depends on: src/types/schema.ts
// - Key Responsibilities: Define ReportContext instance, ReportSummary, and ReportContextType
// - Notes: Isolated in its own file to satisfy fast refresh linter rule
// ---

import { createContext } from 'react';
import type {
  MaintenanceReportState,
  LocationInfo,
  RealizationDate,
  PhotoSlot,
  ChecklistItem,
  ElectricalMeasurement,
  PVDatasheet,
  STCDataRow,
  DamageItem, TechnicalRecommendationItem,
  RecommendationItem,
} from '../types/schema';

export interface ReportSummary {
  id: string;
  name: string;
  lokasi: string;
  photoCount: number;
  updatedAt: string;
  fileSizeKb: number;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unsaved';

export interface ReportContextType {
  state: MaintenanceReportState;
  currentReportId: string;
  reportList: ReportSummary[];
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  hasUnsavedChanges: boolean;
  loadReport: (id: string) => Promise<boolean>;
  refreshCurrentReport: (options?: { force?: boolean }) => Promise<boolean>;
  saveReportNow: () => Promise<boolean>;
  createReport: (name: string, lokasi?: string) => Promise<string | null>;
  refreshReportList: () => Promise<ReportSummary[]>;
  updateLocation: (fields: Partial<LocationInfo>) => void;
  updateRealizationDate: (index: number, fields: Partial<RealizationDate>) => void;
  updatePhotoSlot: (slotId: string, fields: Partial<PhotoSlot>) => void;
  setPhasePhotosDate: (phaseKey: string, date: string) => void;
  setPhotoSlotImage: (slotId: string, file: File) => Promise<void>;
  setPhotoSlotDataUrl: (
    slotId: string,
    rendered34DataUrl: string,
    rawSourceDataUrl?: string,
    adjustment?: { isFitted?: boolean; panX?: number; panY?: number }
  ) => Promise<void> | void;
  removePhotoSlotImage: (slotId: string) => Promise<void> | void;
  updateChecklistItem: (id: string, fields: Partial<ChecklistItem>) => void;
  updateMeasurement: (id: string, fields: Partial<ElectricalMeasurement>) => void;
  insertMeasurement: (
    targetId: string,
    position: 'before' | 'after',
    initialData?: Partial<ElectricalMeasurement>
  ) => void;
  addMeasurement: (
    group: 'dc_vmp' | 'dc_imp' | 'dc_voc' | 'dc' | 'ac' | 'ground',
    position?: 'START' | 'END',
    initialData?: Partial<ElectricalMeasurement>
  ) => void;
  deleteMeasurement: (id: string) => void;
  updateDatasheet: (fields: Partial<PVDatasheet>) => void;
  updateSTCRow: (stringIndex: number, rowIndex: number, fields: Partial<STCDataRow>) => void;
  updateConclusions: (fields: Partial<MaintenanceReportState['conclusions']>) => void;
  addDamage: () => void;
  updateDamage: (id: string, fields: Partial<DamageItem>) => void;
  deleteDamage: (id: string) => void;
  setDamages: (damages: DamageItem[]) => void;
  addTechnicalRecommendation: () => void;
  updateTechnicalRecommendation: (id: string, fields: Partial<TechnicalRecommendationItem>) => void;
  deleteTechnicalRecommendation: (id: string) => void;
  setTechnicalRecommendations: (items: TechnicalRecommendationItem[]) => void;
  addRecommendation: () => void;
  updateRecommendation: (id: string, fields: Partial<RecommendationItem>) => void;
  deleteRecommendation: (id: string) => void;
  setHidePVAnalisis: (hide: boolean) => void;
  setCustomFileName: (fileName: string) => void;
  addPhotoSlot: (
    phaseKey: PhotoSlot['phaseKey'],
    caption?: string,
    insertAfterSlotId?: string | 'START'
  ) => void;
  movePhotoSlot: (slotId: string, direction: 'prev' | 'next') => void;
  deletePhotoSlot: (slotId: string) => void;
  migrateImages: () => Promise<{ success: boolean; convertedCount: number; newSizeBytes?: number }>;
  resetAll: (targetId?: string) => Promise<boolean>;
}

export const ReportContext = createContext<ReportContextType | null>(null);

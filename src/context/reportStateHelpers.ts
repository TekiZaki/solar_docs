// ---
// Summary:
// - Purpose: Pure construction and merge helpers for solar maintenance report state
// - Role: Domain state helpers
// - Depends on: src/types/schema.ts, src/constants/defaultData.ts, src/constants/photoSlots.ts
// - Key Responsibilities: Provide report identity keys, default state factory, and saved-slot merging
// - Notes: Extracted from ReportContext.tsx so the provider stays focused on orchestration
// ---

import type { ElectricalMeasurement, MaintenanceReportState, PhotoSlot } from '../types/schema';
import {
  DEFAULT_LOCATION, DEFAULT_REALIZATION_DATES, DEFAULT_CHECKLIST,
  DEFAULT_MEASUREMENTS, DEFAULT_DATASHEET, DEFAULT_STC_STRINGS,
  DEFAULT_DAMAGES, DEFAULT_RECOMMENDATIONS, DEFAULT_CONCLUSIONS,
} from '../constants/defaultData';
import { createInitialPhotoSlots } from '../constants/photoSlots';

export const DEFAULT_REPORT_ID = 'REPORT_MT_PLTS_JKT_SMPN_72';
export const ACTIVE_REPORT_KEY = 'solar_pv_active_report_id';

const VOC_PREFIX = 'dc_voc_';

// the Voc & Irradiance example section is a template default, so reports saved before
// it existed get the rows on load; a partially emptied section is left as the user set it
function withDefaultVocRows(measurements: ElectricalMeasurement[]): ElectricalMeasurement[] {
  if (measurements.some((m) => m.id.startsWith(VOC_PREFIX))) return measurements;
  return [...measurements, ...DEFAULT_MEASUREMENTS.filter((m) => m.id.startsWith(VOC_PREFIX))];
}

export function createDefaultState(): MaintenanceReportState {
  return {
    location: DEFAULT_LOCATION,
    realizationDates: DEFAULT_REALIZATION_DATES,
    photoSlots: createInitialPhotoSlots(),
    checklist: DEFAULT_CHECKLIST,
    measurements: DEFAULT_MEASUREMENTS,
    datasheet: DEFAULT_DATASHEET,
    stcStrings: DEFAULT_STC_STRINGS,
    conclusions: DEFAULT_CONCLUSIONS,
    damages: DEFAULT_DAMAGES,
    recommendations: DEFAULT_RECOMMENDATIONS,
    technicalRecommendations: [],
    hidePVAnalisis: false,
    customFileName: `${DEFAULT_REPORT_ID}.docx`,
  };
}

export function mergeStateWithSlots(parsed: Partial<MaintenanceReportState> & { id?: string }): MaintenanceReportState {
  const initialSlots = createInitialPhotoSlots();
  const mergedSlots: Record<string, PhotoSlot> = {};

  // rebuild in the saved key order: that order is the user's card layout, and
  // rebuilding from the template would drag inserted or moved cards to the bottom
  for (const [id, savedSlot] of Object.entries(parsed.photoSlots ?? {})) {
    if (!savedSlot) continue;
    const initSlot = initialSlots[id];
    if (initSlot) {
      mergedSlots[id] = {
        ...initSlot,
        ...savedSlot,
        rId: initSlot.rId,
        mediaTarget: initSlot.mediaTarget,
        section: initSlot.section,
      };
    } else if (savedSlot.isCustom) {
      mergedSlots[id] = savedSlot;
    }
  }
  // template slots missing from the file (added after the file was saved) go last
  for (const [id, initSlot] of Object.entries(initialSlots)) {
    if (!mergedSlots[id]) {
      mergedSlots[id] = initSlot;
    }
  }
  // customFileName always tracks the report file id so the export modal
  // already shows the correct name without needing Reset Default
  const reportId = typeof parsed.id === 'string' ? parsed.id.trim() : '';
  const customFileName = reportId ? `${reportId}.docx` : parsed.customFileName;
  return {
    location: parsed.location || DEFAULT_LOCATION,
    realizationDates: parsed.realizationDates || DEFAULT_REALIZATION_DATES,
    photoSlots: mergedSlots,
    checklist: parsed.checklist || DEFAULT_CHECKLIST,
    measurements: withDefaultVocRows(parsed.measurements || DEFAULT_MEASUREMENTS),
    datasheet: parsed.datasheet || DEFAULT_DATASHEET,
    stcStrings: parsed.stcStrings || DEFAULT_STC_STRINGS,
    conclusions: parsed.conclusions || DEFAULT_CONCLUSIONS,
    damages: parsed.damages || DEFAULT_DAMAGES,
    recommendations: parsed.recommendations || DEFAULT_RECOMMENDATIONS,
    technicalRecommendations: Array.isArray(parsed.technicalRecommendations)
      ? parsed.technicalRecommendations
      : [],
    analysisNarrative: parsed.analysisNarrative,
    hidePVAnalisis: Boolean(parsed.hidePVAnalisis),
    customFileName,
  };
}

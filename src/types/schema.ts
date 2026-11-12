// ---
// Summary:
// - Purpose: Type definitions and interfaces for Solar PV maintenance reporting
// - Role: Domain schema
// - Key Responsibilities: Define state models for location, phases, photo slots, checklists, measurements, STC analysis, damage, and recommendations
// - Notes: Strictly mirrors OpenXML requirements from REPORT_MT PLTS JKT_SMPN_72.docx
// ---

export interface LocationInfo {
  lokasi: string;
  alamat: string;
  kapasitas: string;
  jenisAtap: string;
  pelaksana: string;
  unitKerja: string;
  penjabaranAktivitas: string;
  uraianKegiatan: string;
  tahunAnggaran: string;
}

export interface RealizationDate {
  phase: string;
  label: string;
  tanggalPelaksanaan: string;
  kondisiCuaca: string;
}

export interface PhotoSlot {
  id: string; // e.g. slot_001, slot_009
  section: string; // e.g. "II.I. PENGECEKAN KONDISI INSTALASI"
  phaseKey: 'general' | 'physical' | 'pre_measure' | 'cleaning' | 'post_measure';
  mediaTarget: string; // e.g. "media/image10.png"
  rId: string; // e.g. "rId18"
  defaultCaption: string;
  defaultDate: string;
  caption: string;
  date: string;
  imageDataUrl?: string; // base64 / data URL rendered 3:4 for display and docx
  imagePath?: string; // discrete file path on server e.g. "data/reports/<report-id>/<slot-id>.jpg"
  rawImageDataUrl?: string; // uncropped source image
  rawImagePath?: string; // discrete uncropped source file on server
  panX?: number; // pan offset ratio (-1 to 1)
  panY?: number; // pan offset ratio (-1 to 1)
  isFitted?: boolean; // true if double-tapped to fit entire image with white background
  isUploaded: boolean;
  isCustom?: boolean;
  updatedAt?: number;
}

export interface ChecklistItem {
  id: string;
  no: string;
  item: string;
  deskripsi: string;
  keterangan: string;
}

export interface ElectricalMeasurement {
  id: string;
  no: string;
  parameter: string;
  hasilBefore: string;
  hasilAfter: string;
  standard?: string;
}

export interface STCDataRow {
  parameter: 'VOC' | 'VMP' | 'ISC' | 'IMP';
  nom: string;
  stc: string;
  meas: string;
  hasilAnalisa: string; // Auto-calculated e.g. "5,50%"
}

export interface STCStringData {
  stringName: 'STRING 1' | 'STRING 2' | 'STRING 3';
  rows: STCDataRow[];
}

export interface PVDatasheet {
  nominalPower: string; // e.g. "330 W"
  ratedVoltageVmp: string; // e.g. "38,94 V"
  openCircuitVoltageVoc: string; // e.g. "45,94 V"
  ratedCurrentImp: string; // e.g. "8,47 A"
  shortCircuitCurrentIsc: string; // e.g. "8,95 A"
  maximumSystemVoltage: string; // e.g. "1500 V"
  numberOfModules: string; // e.g. "16"
}

export interface TechnicalRecommendationItem {
  id: string;
  no: string;
  parameterTemuan: string;
  rekomendasiTeknis: string;
}

export interface AnalysisNarrative {
  introSTC?: string;
  vocAnalysis?: string;
  vmpAnalysis?: string;
  pvModuleConclusion?: string;
  executiveSummary?: string;
}

export interface DamageItem {
  rekomendasi?: string;
  id: string;
  no: string;
  lokasi: string;
  kerusakanDiLokasi: string;
  perbaikanYangDilakukan: string;
  updateKerusakan: string;
}

export interface RecommendationItem {
  id: string;
  no: string;
  lokasi: string;
  kerusakanDiLokasi: string;
  updateKerusakan: string;
  rekomendasi: string;
}

export interface MaintenanceReportState {
  location: LocationInfo;
  realizationDates: RealizationDate[];
  photoSlots: Record<string, PhotoSlot>;
  checklist: ChecklistItem[];
  measurements: ElectricalMeasurement[];
  datasheet: PVDatasheet;
  stcStrings: STCStringData[];
  conclusions: {
    pvModuleSummary: string;
    operationalCondition: string;
    stringBalance: string;
    maintenanceEffectiveness: string;
  };
  damages: DamageItem[];
  recommendations: RecommendationItem[];
  technicalRecommendations?: TechnicalRecommendationItem[];
  analysisNarrative?: AnalysisNarrative;
  hidePVAnalisis?: boolean;
  customFileName?: string;
}

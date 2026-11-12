// ---
// Summary:
// - Purpose: Initial default data extracted from REPORT_MT PLTS JKT_SMPN_72.docx
// - Role: Domain default dataset
// - Depends on: src/types/schema.ts
// - Key Responsibilities: Provide initial state for Location, Checklist, Measurements, Datasheet, STC Strings, Damage, and Recommendations
// - Notes: Follows input_from_me.md specifications
// ---

import type {
  LocationInfo,
  RealizationDate,
  ChecklistItem,
  ElectricalMeasurement,
  PVDatasheet,
  STCStringData,
  DamageItem,
  RecommendationItem,
} from '../types/schema';

export const DEFAULT_LOCATION: LocationInfo = {
  lokasi: '',
  alamat: '',
  kapasitas: '15 kWp',
  jenisAtap: 'Atap Miring (Genteng)',
  pelaksana: 'PT. Sinergi Artha Azkia',
  unitKerja: 'SUKU DINAS TENAGA KERJA, TRANSMIGRASI DAN ENERGI KOTA ADMINISTRATIF JAKARTA PUSAT',
  penjabaranAktivitas: 'Pemeliharaan PLTS Rooftop di Wilayah Jakarta Pusat',
  uraianKegiatan: 'Pemeliharaan PLTS Rooftop di Wilayah Jakarta Pusat',
  tahunAnggaran: '2026',
};

export const DEFAULT_REALIZATION_DATES: RealizationDate[] = [
  {
    phase: 'pra',
    label: '1. Pengecekan & Pengukuran Pra Pembersihan',
    tanggalPelaksanaan: '',
    kondisiCuaca: '',
  },
  {
    phase: 'pembersihan',
    label: '2. Pembersihan Panel Surya',
    tanggalPelaksanaan: '',
    kondisiCuaca: '',
  },
  {
    phase: 'pasca',
    label: '3. Pengecekan & Pengukuran Pasca Pembersihan',
    tanggalPelaksanaan: '',
    kondisiCuaca: '',
  },
];

// category header rows of the physical checklist have no inputs to fill
export const NON_EDITABLE_CHECKLIST_IDS = new Set([
  'chk_01', // 1 Panel Surya
  'chk_06', // 2 Panel DC Combiner Box
  'chk_07', // 2.1 Fuse DC
  'chk_12', // 2.2 MCB DC
  'chk_17', // 2.3 SPD DC
  'chk_22', // 2.4 DC Disconnector
  'chk_27', // 3 Panel AC Combiner Box
  'chk_28', // 3.1 MCB Incoming
  'chk_33', // 3.2 MCB Outgoing
  'chk_38', // 4 Inverter
  'chk_43', // 5 RMS
]);

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    "id": "chk_01",
    "no": "1",
    "item": "Panel Surya",
    "deskripsi": "",
    "keterangan": ""
  },
  {
    "id": "chk_02",
    "no": "1.1",
    "item": "Brand / Model",
    "deskripsi": "ADYA SOLAR",
    "keterangan": ""
  },
  {
    "id": "chk_03",
    "no": "1.2",
    "item": "Daya per-modul PV",
    "deskripsi": "330 Wp",
    "keterangan": ""
  },
  {
    "id": "chk_04",
    "no": "1.3",
    "item": "Jumlah Module PV Total",
    "deskripsi": "48 Unit",
    "keterangan": ""
  },
  {
    "id": "chk_05",
    "no": "1.4",
    "item": "Kondisi module PV [OK/NOK]",
    "deskripsi": "OK",
    "keterangan": ""
  },
  {
    "id": "chk_06",
    "no": "2",
    "item": "Panel DC Combiner Box",
    "deskripsi": "",
    "keterangan": ""
  },
  {
    "id": "chk_07",
    "no": "2.1",
    "item": "Fuse DC",
    "deskripsi": "",
    "keterangan": ""
  },
  {
    "id": "chk_08",
    "no": "2.1.1",
    "item": "Brand",
    "deskripsi": "Suntree",
    "keterangan": ""
  },
  {
    "id": "chk_09",
    "no": "2.1.2",
    "item": "Kapasitas Arus Fuse",
    "deskripsi": "16 A / 1000V",
    "keterangan": ""
  },
  {
    "id": "chk_10",
    "no": "2.1.3",
    "item": "Jumlah Fuse",
    "deskripsi": "3 buah",
    "keterangan": "3 String"
  },
  {
    "id": "chk_11",
    "no": "2.1.4",
    "item": "Kondisi Fuse DC [OK/NOK]",
    "deskripsi": "OK",
    "keterangan": ""
  },
  {
    "id": "chk_12",
    "no": "2.2",
    "item": "MCB DC",
    "deskripsi": "",
    "keterangan": ""
  },
  {
    "id": "chk_13",
    "no": "2.2.1",
    "item": "Brand",
    "deskripsi": "Suntree",
    "keterangan": ""
  },
  {
    "id": "chk_14",
    "no": "2.2.2",
    "item": "Kapasitas Arus MCB DC",
    "deskripsi": "16A",
    "keterangan": ""
  },
  {
    "id": "chk_15",
    "no": "2.2.3",
    "item": "Jumlah MCB DC",
    "deskripsi": "3",
    "keterangan": ""
  },
  {
    "id": "chk_16",
    "no": "2.2.4",
    "item": "Kondisi MCB DC [OK/NOK]",
    "deskripsi": "OK",
    "keterangan": ""
  },
  {
    "id": "chk_17",
    "no": "2.3",
    "item": "SPD DC",
    "deskripsi": "",
    "keterangan": ""
  },
  {
    "id": "chk_18",
    "no": "2.3.1",
    "item": "Brand",
    "deskripsi": "Suntree",
    "keterangan": ""
  },
  {
    "id": "chk_19",
    "no": "2.3.2",
    "item": "Kapasitas SPD DC",
    "deskripsi": "40 kA/1000V",
    "keterangan": ""
  },
  {
    "id": "chk_20",
    "no": "2.3.3",
    "item": "Jumlah SPD DC",
    "deskripsi": "3 buah",
    "keterangan": "3 String"
  },
  {
    "id": "chk_21",
    "no": "2.3.4",
    "item": "Kondisi SPD DC [OK/NOK]",
    "deskripsi": "OK",
    "keterangan": "Semua SPDB DC dalam kondisi baik"
  },
  {
    "id": "chk_22",
    "no": "2.4",
    "item": "DC Disconnector",
    "deskripsi": "",
    "keterangan": ""
  },
  {
    "id": "chk_23",
    "no": "2.4.1",
    "item": "Brand",
    "deskripsi": "SALZER",
    "keterangan": ""
  },
  {
    "id": "chk_24",
    "no": "2.4.2",
    "item": "Kapasitas DC Disconnector",
    "deskripsi": "32 A / 4 PIN",
    "keterangan": ""
  },
  {
    "id": "chk_25",
    "no": "2.4.3",
    "item": "Jumlah DC Disconnector",
    "deskripsi": "3 buah",
    "keterangan": ""
  },
  {
    "id": "chk_26",
    "no": "2.4.4",
    "item": "Kondisi DC Disconnector [OK/NOK]",
    "deskripsi": "OK",
    "keterangan": "Dalam Kondisi OK"
  },
  {
    "id": "chk_27",
    "no": "3",
    "item": "Panel AC Combiner Box",
    "deskripsi": "",
    "keterangan": ""
  },
  {
    "id": "chk_28",
    "no": "3.1",
    "item": "MCB Incoming",
    "deskripsi": "",
    "keterangan": ""
  },
  {
    "id": "chk_29",
    "no": "3.1.1",
    "item": "Brand",
    "deskripsi": "Schneider",
    "keterangan": ""
  },
  {
    "id": "chk_30",
    "no": "3.1.2",
    "item": "Kapasitas MCB",
    "deskripsi": "40 A",
    "keterangan": ""
  },
  {
    "id": "chk_31",
    "no": "3.1.3",
    "item": "Jumlah MCB",
    "deskripsi": "1",
    "keterangan": "Hanya 1 Inverter"
  },
  {
    "id": "chk_32",
    "no": "3.1.4",
    "item": "Kondisi MCB [OK/nok]",
    "deskripsi": "OK",
    "keterangan": ""
  },
  {
    "id": "chk_33",
    "no": "3.2",
    "item": "MCB Outgoing",
    "deskripsi": "",
    "keterangan": ""
  },
  {
    "id": "chk_34",
    "no": "3.2.1",
    "item": "Brand",
    "deskripsi": "Schneider",
    "keterangan": ""
  },
  {
    "id": "chk_35",
    "no": "3.2.2",
    "item": "Kapasitas MCB",
    "deskripsi": "40 A",
    "keterangan": ""
  },
  {
    "id": "chk_36",
    "no": "3.2.3",
    "item": "Jumlah MCB",
    "deskripsi": "1",
    "keterangan": ""
  },
  {
    "id": "chk_37",
    "no": "3.2.4",
    "item": "Kondisi MCB [OK/nok]",
    "deskripsi": "OK",
    "keterangan": ""
  },
  {
    "id": "chk_38",
    "no": "4",
    "item": "Inverter",
    "deskripsi": "",
    "keterangan": ""
  },
  {
    "id": "chk_39",
    "no": "4.1",
    "item": "Brand/Model",
    "deskripsi": "SMA",
    "keterangan": ""
  },
  {
    "id": "chk_40",
    "no": "4.2",
    "item": "Kapasitas Inverter",
    "deskripsi": "15.000 W",
    "keterangan": ""
  },
  {
    "id": "chk_41",
    "no": "4.3",
    "item": "Jumlah Inverter",
    "deskripsi": "1 Unit",
    "keterangan": ""
  },
  {
    "id": "chk_42",
    "no": "4.4",
    "item": "Kondisi Inverter [OK/NOK]",
    "deskripsi": "OK",
    "keterangan": "Inverter dalam Kondisi Baik"
  },
  {
    "id": "chk_43",
    "no": "5",
    "item": "RMS",
    "deskripsi": "",
    "keterangan": ""
  },
  {
    "id": "chk_44",
    "no": "5.1",
    "item": "Kondisi RMS [ONLINE/OFFLINE]",
    "deskripsi": "ONLINE",
    "keterangan": ""
  },
  {
    "id": "chk_45",
    "no": "5.2",
    "item": "Kondisi Smart TV [OK/NOK]",
    "deskripsi": "NOK",
    "keterangan": ""
  }
];

export const EXAMPLE_MEASUREMENTS: Record<string, { before: string; after: string }> = {
  dc_vmp_1: { before: '495', after: '527' },
  dc_vmp_2: { before: '498', after: '521' },
  dc_vmp_3: { before: '508', after: '533' },
  dc_imp_1: { before: '6,19', after: '5,17' },
  dc_imp_2: { before: '6,17', after: '5,05' },
  dc_imp_3: { before: '5,99', after: '5,19' },
  dc_voc_1: { before: '730', after: '730' },
  dc_voc_2: { before: '522', after: '522' },
  dc_voc_3: { before: '727', after: '727' },
  dc_voc_4: { before: '253', after: '253' },
  dc_voc_5: { before: '734', after: '734' },
  dc_voc_6: { before: '472', after: '472' },
  ac_v_rn: { before: '216,5', after: '216,5' },
  ac_v_sn: { before: '228,9', after: '228,9' },
  ac_v_tn: { before: '224,2', after: '224,2' },
  ac_v_ng: { before: '4,83', after: '4,83' },
  ac_v_rs: { before: '384,5', after: '386,4' },
  ac_v_rt: { before: '384,1', after: '390,0' },
  ac_v_st: { before: '389,1', after: '385,6' },
  ac_i_r: { before: '11,39', after: '11,39' },
  ac_i_s: { before: '11,44', after: '11,44' },
  ac_i_t: { before: '11,51', after: '11,57' },
  ac_freq: { before: '50', after: '50' },
  ground_r: { before: '0,9', after: '0,09' },
};

// Official reference standards for the BEFORE/AFTER/STANDARD comparison table.
// Rows without a standard (phase currents, frequency, grounding) stay blank.
export const AC_STANDARD_VALUES: Record<string, string> = {
  ac_v_rn: '220 V ± 5%',
  ac_v_sn: '220 V ± 5%',
  ac_v_tn: '220 V ± 5%',
  ac_v_ng: '< 5Vac',
  ac_v_rs: '380 V ± 5%',
  ac_v_rt: '380 V ± 5%',
  ac_v_st: '380 V ± 5%',
};

export const DEFAULT_MEASUREMENTS: ElectricalMeasurement[] = [
  { id: 'dc_vmp_1', no: '1.1.1', parameter: 'String 1 [Vdc]', hasilBefore: '', hasilAfter: '' },
  { id: 'dc_vmp_2', no: '1.1.2', parameter: 'String 2 [Vdc]', hasilBefore: '', hasilAfter: '' },
  { id: 'dc_vmp_3', no: '1.1.3', parameter: 'String 3 [Vdc]', hasilBefore: '', hasilAfter: '' },
  { id: 'dc_imp_1', no: '1.2.1', parameter: 'String 1 [Adc]', hasilBefore: '', hasilAfter: '' },
  { id: 'dc_imp_2', no: '1.2.2', parameter: 'String 2 [Adc]', hasilBefore: '', hasilAfter: '' },
  { id: 'dc_imp_3', no: '1.2.3', parameter: 'String 3 [Adc]', hasilBefore: '', hasilAfter: '' },
  { id: 'dc_voc_1', no: '1.3.1', parameter: 'String 1 Voc [Vdc]', hasilBefore: '', hasilAfter: '' },
  { id: 'dc_voc_2', no: '1.3.2', parameter: 'String 1 Irradiance [w/m2]', hasilBefore: '', hasilAfter: '' },
  { id: 'dc_voc_3', no: '1.3.3', parameter: 'String 2 Voc [Vdc]', hasilBefore: '', hasilAfter: '' },
  { id: 'dc_voc_4', no: '1.3.4', parameter: 'String 2 Irradiance [w/m2]', hasilBefore: '', hasilAfter: '' },
  { id: 'dc_voc_5', no: '1.3.5', parameter: 'String 3 Voc [Vdc]', hasilBefore: '', hasilAfter: '' },
  { id: 'dc_voc_6', no: '1.3.6', parameter: 'String 3 Irradiance [w/m2]', hasilBefore: '', hasilAfter: '' },
  { id: 'ac_v_rn', no: '2.1', parameter: 'Tegangan Fasa R - Netral [Vac]', hasilBefore: '', hasilAfter: '' },
  { id: 'ac_v_sn', no: '2.2', parameter: 'Tegangan Fasa S - Netral [Vac]', hasilBefore: '', hasilAfter: '' },
  { id: 'ac_v_tn', no: '2.3', parameter: 'Tegangan Fasa T - Netral [Vac]', hasilBefore: '', hasilAfter: '' },
  { id: 'ac_v_ng', no: '2.4', parameter: 'Tegangan Fasa Netral - Grounding [Vac]', hasilBefore: '', hasilAfter: '' },
  { id: 'ac_v_rs', no: '2.5', parameter: 'Tegangan Fasa R - S [Vac]', hasilBefore: '', hasilAfter: '' },
  { id: 'ac_v_rt', no: '2.6', parameter: 'Tegangan Fasa R - T [Vac]', hasilBefore: '', hasilAfter: '' },
  { id: 'ac_v_st', no: '2.7', parameter: 'Tegangan Fasa S - T [Vac]', hasilBefore: '', hasilAfter: '' },
  { id: 'ac_i_r', no: '2.8', parameter: 'Arus Fasa R [Aac]', hasilBefore: '', hasilAfter: '' },
  { id: 'ac_i_s', no: '2.9', parameter: 'Arus Fasa S [Aac]', hasilBefore: '', hasilAfter: '' },
  { id: 'ac_i_t', no: '2.10', parameter: 'Arus Fasa T [Aac]', hasilBefore: '', hasilAfter: '' },
  { id: 'ac_freq', no: '2.11', parameter: 'Frekuensi [Hz]', hasilBefore: '', hasilAfter: '' },
  { id: 'ground_r', no: '3.1', parameter: 'Tahanan Grounding [Ohm]', hasilBefore: '', hasilAfter: '' },
];

export const EXAMPLE_DATASHEET: PVDatasheet = {
  nominalPower: '330 W',
  ratedVoltageVmp: '38,94 V',
  openCircuitVoltageVoc: '45,94 V',
  ratedCurrentImp: '8,47 A',
  shortCircuitCurrentIsc: '8,95 A',
  maximumSystemVoltage: '1500 V',
  numberOfModules: '16',
};

export const DEFAULT_DATASHEET: PVDatasheet = {
  nominalPower: '',
  ratedVoltageVmp: '',
  openCircuitVoltageVoc: '',
  ratedCurrentImp: '',
  shortCircuitCurrentIsc: '',
  maximumSystemVoltage: '',
  numberOfModules: '',
};

export const EXAMPLE_STC_STRINGS: STCStringData[] = [
  {
    stringName: 'STRING 1',
    rows: [
      { parameter: 'VOC', nom: '735,0', stc: '673,0', meas: '636,0', hasilAnalisa: '5,50%' },
      { parameter: 'VMP', nom: '623,0', stc: '571,0', meas: '534,0', hasilAnalisa: '6,48%' },
      { parameter: 'ISC', nom: '9,0', stc: '6,8', meas: '5,2', hasilAnalisa: '23,53%' },
      { parameter: 'IMP', nom: '8,5', stc: '5,9', meas: '4,3', hasilAnalisa: '27,12%' },
    ],
  },
  {
    stringName: 'STRING 2',
    rows: [
      { parameter: 'VOC', nom: '735,0', stc: '667,0', meas: '630,0', hasilAnalisa: '5,55%' },
      { parameter: 'VMP', nom: '623,0', stc: '562,0', meas: '525,0', hasilAnalisa: '6,58%' },
      { parameter: 'ISC', nom: '9,0', stc: '6,9', meas: '5,2', hasilAnalisa: '24,64%' },
      { parameter: 'IMP', nom: '8,5', stc: '6,0', meas: '4,4', hasilAnalisa: '26,67%' },
    ],
  },
  {
    stringName: 'STRING 3',
    rows: [
      { parameter: 'VOC', nom: '735,0', stc: '688,0', meas: '648,0', hasilAnalisa: '5,81%' },
      { parameter: 'VMP', nom: '623,0', stc: '578,0', meas: '538,0', hasilAnalisa: '6,92%' },
      { parameter: 'ISC', nom: '9,0', stc: '7,0', meas: '5,2', hasilAnalisa: '25,71%' },
      { parameter: 'IMP', nom: '8,5', stc: '6,2', meas: '4,5', hasilAnalisa: '27,42%' },
    ],
  },
];

export const DEFAULT_STC_STRINGS: STCStringData[] = [
  {
    stringName: 'STRING 1',
    rows: [
      { parameter: 'VOC', nom: '', stc: '', meas: '', hasilAnalisa: '' },
      { parameter: 'VMP', nom: '', stc: '', meas: '', hasilAnalisa: '' },
      { parameter: 'ISC', nom: '', stc: '', meas: '', hasilAnalisa: '' },
      { parameter: 'IMP', nom: '', stc: '', meas: '', hasilAnalisa: '' },
    ],
  },
  {
    stringName: 'STRING 2',
    rows: [
      { parameter: 'VOC', nom: '', stc: '', meas: '', hasilAnalisa: '' },
      { parameter: 'VMP', nom: '', stc: '', meas: '', hasilAnalisa: '' },
      { parameter: 'ISC', nom: '', stc: '', meas: '', hasilAnalisa: '' },
      { parameter: 'IMP', nom: '', stc: '', meas: '', hasilAnalisa: '' },
    ],
  },
  {
    stringName: 'STRING 3',
    rows: [
      { parameter: 'VOC', nom: '', stc: '', meas: '', hasilAnalisa: '' },
      { parameter: 'VMP', nom: '', stc: '', meas: '', hasilAnalisa: '' },
      { parameter: 'ISC', nom: '', stc: '', meas: '', hasilAnalisa: '' },
      { parameter: 'IMP', nom: '', stc: '', meas: '', hasilAnalisa: '' },
    ],
  },
];

export const DEFAULT_DAMAGES: DamageItem[] = [
  {
    id: 'dmg_01',
    no: '1',
    lokasi: '',
    kerusakanDiLokasi: 'Tidak Ada',
    perbaikanYangDilakukan: 'Tidak Ada',
    updateKerusakan: 'Tidak Ada',
  },
];

export const DEFAULT_RECOMMENDATIONS: RecommendationItem[] = [
  {
    id: 'rec_01',
    no: '1',
    lokasi: '',
    kerusakanDiLokasi: 'Tidak Ada',
    updateKerusakan: 'Tidak Ada',
    rekomendasi: 'Pengecekan lebih lanjut untuk Smart TV, untuk pengaktifan kembali',
  },
];

export const DEFAULT_CONCLUSIONS = {
  pvModuleSummary:
    'PV Module di [LOKASI_CAPS] masih dalam kondisi baik dan tidak menunjukkan degradasi yang signifikan. Sistem bekerja dalam parameter yang sehat untuk mendukung operasional Inverter Kehua Tech 20 kW.',
  operationalCondition:
    'Kondisi Operasional Normal: Penurunan tegangan (Voc dan Vmp) sebesar 5% - 6% dari nilai STC adalah kondisi yang wajar dan normal untuk instalasi di wilayah ini. Hal ini disebabkan oleh temperatur operasional modul di lapangan yang jauh lebih tinggi (bisa mencapai 50°C - 60°C) dibandingkan standar laboratorium STC (25°C).',
  stringBalance:
    'Keseimbangan Antar String: Ketiga string menunjukkan nilai yang relatif seragam (berada di rentang 525 V - 538 V) menandakan tidak ada kerusakan sel tunggal yang drastis atau modul yang mati total dalam rangkaian.',
  maintenanceEffectiveness:
    'Efektivitas Pemeliharaan: Terjadi perbaikan nilai Vmp dan Isc setelah pembersihan PV module.',
};

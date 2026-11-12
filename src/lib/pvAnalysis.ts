// ---
// Summary:
// - Purpose: Automated analysis engine for Solar PV STC calculations, field measurements, and recommendations
// - Role: Domain calculation and report synthesis service
// - Depends on: src/types/schema.ts, src/lib/calculations.ts
// - Key Responsibilities: Calculate STC theoretical values, evaluate Voc/Vmp deviations, detect outlier strings, synthesize 6-point conclusions, generate 10 technical recommendations, and extract damage inventory from NOK checklist items
// ---

import type {
  MaintenanceReportState,
  TechnicalRecommendationItem,
  DamageItem,
} from '../types/schema';
import { parseIndoNumber } from './calculations';

export interface PVStringAnalysis {
  name: string;
  voc: number;
  irr: number;
  vmp: number;
  imp: number;
  deviasiVoc: number;
  deviasiVmp: number;
  rasioVmpVoc: number;
  vocPctSTC: number;
}

export interface PVAnalysisResult {
  brand: string;
  nominalPowerWp: number;
  ratedVoltageVmp: number;
  openCircuitVoltageVoc: number;
  ratedCurrentImp: number;
  shortCircuitCurrentIsc: number;
  totalModules: number;
  stringCount: number;
  modulesPerString: number;
  kapasitasPerString: number;
  vocSTC: number;
  vmpSTC: number;
  impSTC: number;
  iscSTC: number;
  strings: PVStringAnalysis[];
  minVoc: number;
  maxVoc: number;
  deltaVoc: number;
  minVocPct: number;
  maxVocPct: number;
  minIrr: number;
  maxIrr: number;
  deltaIrr: number;
  minVmp: number;
  maxVmp: number;
  outlierString: PVStringAnalysis;
  balancedStrings: PVStringAnalysis[];
  executiveConclusion: string;
  technicalRecommendations: TechnicalRecommendationItem[];
  detectedDamages: DamageItem[];
}

export function computePVAnalysis(state: MaintenanceReportState): PVAnalysisResult {
  const lokasi = state.location.lokasi.trim() || 'LOKASI PLTS';

  // Extract from Checklist II.I
  const chkBrand = state.checklist.find((c) => c.no === '1.1')?.deskripsi.trim() || 'ADYA SOLAR';
  const chkDaya = state.checklist.find((c) => c.no === '1.2')?.deskripsi.trim() || '250 Wp';
  const chkTotal = state.checklist.find((c) => c.no === '1.3')?.deskripsi.trim() || '60 Unit';
  const chkFuse = state.checklist.find((c) => c.no === '2.1.3')?.keterangan.trim() || '';

  // Parse string count (default 3)
  let stringCount = 3;
  const fuseMatch = chkFuse.match(/(\d+)\s*String/i);
  if (fuseMatch) {
    stringCount = parseInt(fuseMatch[1], 10) || 3;
  }

  // Parse datasheet or fallback to checklist values
  const nominalPowerWp =
    parseIndoNumber(state.datasheet.nominalPower) || parseIndoNumber(chkDaya) || 250;
  const ratedVoltageVmp = parseIndoNumber(state.datasheet.ratedVoltageVmp) || 37.4;
  const openCircuitVoltageVoc = parseIndoNumber(state.datasheet.openCircuitVoltageVoc) || 46.2;
  const ratedCurrentImp = parseIndoNumber(state.datasheet.ratedCurrentImp) || 6.68;
  const shortCircuitCurrentIsc = parseIndoNumber(state.datasheet.shortCircuitCurrentIsc) || 7.08;

  const totalModules =
    parseInt(chkTotal.replace(/[^0-9]/g, ''), 10) ||
    parseIndoNumber(state.datasheet.numberOfModules) * stringCount ||
    60;

  let modulesPerString = parseIndoNumber(state.datasheet.numberOfModules);
  if (!modulesPerString || modulesPerString <= 0) {
    modulesPerString = Math.round(totalModules / stringCount) || 20;
  }

  // STC Theoretical calculations
  const kapasitasPerString = modulesPerString * nominalPowerWp;
  const vocSTC = Math.round(modulesPerString * openCircuitVoltageVoc * 10) / 10;
  const vmpSTC = Math.round(modulesPerString * ratedVoltageVmp * 10) / 10;
  const impSTC = ratedCurrentImp;
  const iscSTC = shortCircuitCurrentIsc;

  // Extract measurements from II.IV (Pasca) with fallback to Pra or default
  const getMeasurementVal = (id: string, defaultVal: number): number => {
    const m = state.measurements.find((item) => item.id === id);
    const parsedAfter = parseIndoNumber(m?.hasilAfter || '');
    if (parsedAfter > 0) return parsedAfter;
    const parsedBefore = parseIndoNumber(m?.hasilBefore || '');
    if (parsedBefore > 0) return parsedBefore;
    return defaultVal;
  };

  const defaultVocs = [719, 722, 719];
  const defaultIrrs = [564, 552, 564];
  const defaultVmps = [602, 597, 574];
  const defaultImps = [5.07, 5.14, 4.99];

  const strings: PVStringAnalysis[] = [];
  for (let i = 1; i <= stringCount; i++) {
    const voc = getMeasurementVal(`dc_voc_${(i - 1) * 2 + 1}`, defaultVocs[i - 1] || 719);
    const irr = getMeasurementVal(`dc_voc_${(i - 1) * 2 + 2}`, defaultIrrs[i - 1] || 560);
    const vmp = getMeasurementVal(`dc_vmp_${i}`, defaultVmps[i - 1] || 600);
    const imp = getMeasurementVal(`dc_imp_${i}`, defaultImps[i - 1] || 5.0);

    const deviasiVoc = vocSTC > 0 ? ((voc - vocSTC) / vocSTC) * 100 : 0;
    const deviasiVmp = vmpSTC > 0 ? ((vmp - vmpSTC) / vmpSTC) * 100 : 0;
    const rasioVmpVoc = voc > 0 ? (vmp / voc) * 100 : 0;
    const vocPctSTC = vocSTC > 0 ? (voc / vocSTC) * 100 : 0;

    strings.push({
      name: `String ${i}`,
      voc,
      irr,
      vmp,
      imp,
      deviasiVoc,
      deviasiVmp,
      rasioVmpVoc,
      vocPctSTC,
    });
  }

  // Summary stats
  const vocs = strings.map((s) => s.voc);
  const irrs = strings.map((s) => s.irr);
  const vmps = strings.map((s) => s.vmp);

  const minVoc = Math.min(...vocs);
  const maxVoc = Math.max(...vocs);
  const deltaVoc = Math.round((maxVoc - minVoc) * 10) / 10;

  const minVocPct = Math.round((minVoc / vocSTC) * 1000) / 10;
  const maxVocPct = Math.round((maxVoc / vocSTC) * 1000) / 10;

  const minIrr = Math.min(...irrs);
  const maxIrr = Math.max(...irrs);
  const deltaIrr = Math.round((maxIrr - minIrr) * 10) / 10;

  const minVmp = Math.min(...vmps);
  const maxVmp = Math.max(...vmps);

  // Identify outlier string (lowest Vmp)
  const sortedByVmp = [...strings].sort((a, b) => a.vmp - b.vmp);
  const outlierString = sortedByVmp[0];
  const balancedStrings = sortedByVmp.slice(1);

  // Executive Conclusion
  const vocListStr = strings.map((s) => `${s.voc} V`).join(', ');
  const vmpListStr = strings.map((s) => `${s.vmp} V`).join(', ');
  const executiveConclusion =
    `Berdasarkan hasil inspeksi, pembersihan, pengukuran kelistrikan dan analisa parameter PV setelah maintenance, PLTS Rooftop ${lokasi} secara umum masih berada dalam kondisi operasional.\n` +
    `Hasil pengukuran Voc menunjukkan nilai ${vocListStr} untuk ${strings.map((s) => s.name).join(', ')}. Keseragaman tersebut menunjukkan bahwa karakteristik open circuit string relatif baik dan tidak menunjukkan indikasi kuat adanya kehilangan modul seri atau kegagalan string berdasarkan parameter Voc.\n` +
    `Nilai Vmp yang diperoleh adalah ${vmpListStr}. ${balancedStrings.map((s) => s.name).join(' dan ')} menunjukkan nilai yang sangat berdekatan, sedangkan ${outlierString.name} memiliki Vmp lebih rendah dibandingkan string lainnya.\n` +
    `Hal yang perlu menjadi perhatian adalah ${outlierString.name} memiliki deviasi Vmp yang lebih rendah, sehingga kondisi tersebut merupakan indikasi yang layak untuk dilakukan monitoring dan pemeriksaan lanjutan.\n` +
    `Secara keseluruhan, tidak ditemukan indikasi dari data pengukuran yang menunjukkan kegagalan total pada salah satu string. Namun, ${outlierString.name} sebaiknya ditetapkan sebagai string yang perlu dipantau lebih lanjut pada maintenance berikutnya.`;

  // 10 Technical Recommendations
  const technicalRecommendations: TechnicalRecommendationItem[] = [
    {
      id: 'rec_01',
      no: '1',
      parameterTemuan: `Vmp ${outlierString.name} = ${outlierString.vmp} V, lebih rendah dibanding string lainnya`,
      rekomendasiTeknis: `Lakukan trending Vmp ${outlierString.name} pada setiap periode maintenance untuk melihat apakah deviasi bersifat konsisten atau semakin meningkat.`,
    },
    {
      id: 'rec_02',
      no: '2',
      parameterTemuan: `Voc ${outlierString.name} = ${outlierString.voc} V, relatif seragam`,
      rekomendasiTeknis: `Tidak perlu langsung menyimpulkan adanya modul rusak. Lakukan pemeriksaan lebih lanjut melalui IV Curve Test dan inspeksi modul individual apabila deviasi Vmp tetap muncul.`,
    },
    {
      id: 'rec_03',
      no: '3',
      parameterTemuan: `Irradiance pengukuran berada pada rentang ${minIrr}–${maxIrr} W/m²`,
      rekomendasiTeknis: `Perbedaan Vmp tidak dapat dijelaskan hanya berdasarkan irradiance. Periksa temperatur modul, potensi partial shading, mismatch dan koneksi DC.`,
    },
    {
      id: 'rec_04',
      no: '4',
      parameterTemuan: 'Voc seluruh string sangat seragam',
      rekomendasiTeknis: 'Pertahankan pola pencatatan Voc per-string karena parameter ini efektif untuk memantau kontinuitas rangkaian seri modul PV.',
    },
    {
      id: 'rec_05',
      no: '5',
      parameterTemuan: 'Imp seluruh string relatif berdekatan',
      rekomendasiTeknis: 'Tidak terdapat indikasi ketidakseimbangan arus yang ekstrem; tetap lakukan trending Imp bersama Vmp pada pemeliharaan berikutnya.',
    },
    {
      id: 'rec_06',
      no: '6',
      parameterTemuan: `Irradiance pengukuran hanya ${minIrr}–${maxIrr} W/m² (di bawah STC 1.000 W/m²)`,
      rekomendasiTeknis: 'Pada pengukuran berikutnya catat irradiance dan temperatur modul secara simultan agar hasil dapat dibandingkan secara lebih valid.',
    },
    {
      id: 'rec_07',
      no: '7',
      parameterTemuan: 'Perbandingan terhadap STC menunjukkan deviasi Voc/Vmp cukup besar',
      rekomendasiTeknis: 'Jangan menggunakan deviasi terhadap STC sebagai persentase degradasi modul. Gunakan koreksi temperatur dan/atau hasil IV Curve yang dinormalisasi ke STC.',
    },
    {
      id: 'rec_08',
      no: '8',
      parameterTemuan: `Potensi perbedaan karakteristik ${outlierString.name}`,
      rekomendasiTeknis: 'Periksa konektor MC4, terminal DC Combiner Box, kabel string, fuse/proteksi DC dan sambungan sebelum melakukan penggantian modul.',
    },
    {
      id: 'rec_09',
      no: '9',
      parameterTemuan: 'Potensi shading / mismatch',
      rekomendasiTeknis: 'Lakukan inspeksi visual terhadap shading lokal dan, bila diperlukan, thermal imaging serta I-V curve tracing untuk menemukan modul yang menyimpang.',
    },
    {
      id: 'rec_10',
      no: '10',
      parameterTemuan: 'Dokumentasi pengukuran',
      rekomendasiTeknis: 'Pada maintenance berikutnya pertahankan format pencatatan Voc + Vmp + Imp + irradiance + temperatur modul untuk setiap string.',
    },
  ];

  // Extract Damage Inventory from NOK items in Checklist II.I
  const detectedDamages: DamageItem[] = [];
  let dmgIdx = 1;
  for (const item of state.checklist) {
    const textDesc = item.deskripsi.toUpperCase();
    const textKet = item.keterangan.toUpperCase();
    if (
      textDesc.includes('NOK') ||
      textKet.includes('NOK') ||
      textDesc.includes('RUSAK') ||
      textKet.includes('RUSAK') ||
      textDesc.includes('OFFLINE') ||
      textKet.includes('OFFLINE')
    ) {
      detectedDamages.push({
        id: `dmg_auto_${dmgIdx}`,
        no: String(dmgIdx++),
        lokasi,
        kerusakanDiLokasi: `Kondisi ${item.item}: ${item.deskripsi || 'NOK'} ${item.keterangan ? `(${item.keterangan})` : ''}`.trim(),
        perbaikanYangDilakukan: 'Pemeriksaan fisik dan pengujian koneksi',
        updateKerusakan: 'Perlu tindak lanjut / perbaikan',
        rekomendasi: `Perbaikan atau penggantian komponen ${item.item}`,
      });
    }
  }

  // If no damage detected, add default clean entry
  if (detectedDamages.length === 0) {
    detectedDamages.push({
      id: 'dmg_clean_01',
      no: '1',
      lokasi,
      kerusakanDiLokasi: 'Tidak Ada',
      perbaikanYangDilakukan: 'Tidak Ada',
      updateKerusakan: 'Tidak Ada',
      rekomendasi: 'Kondisi instalasi dalam keadaan baik',
    });
  }

  return {
    brand: chkBrand,
    nominalPowerWp,
    ratedVoltageVmp,
    openCircuitVoltageVoc,
    ratedCurrentImp,
    shortCircuitCurrentIsc,
    totalModules,
    stringCount,
    modulesPerString,
    kapasitasPerString,
    vocSTC,
    vmpSTC,
    impSTC,
    iscSTC,
    strings,
    minVoc,
    maxVoc,
    deltaVoc,
    minVocPct,
    maxVocPct,
    minIrr,
    maxIrr,
    deltaIrr,
    minVmp,
    maxVmp,
    outlierString,
    balancedStrings,
    executiveConclusion,
    technicalRecommendations,
    detectedDamages,
  };
}

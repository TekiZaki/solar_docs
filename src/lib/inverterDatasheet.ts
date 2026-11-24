// ---
// Summary:
// - Purpose: Resolve PV module datasheet presets based on inverter brand and capacity in checklist items 4.1 & 4.2
// - Role: Domain preset helper
// - Depends on: src/types/schema.ts, src/constants/defaultData.ts
// - Key Responsibilities: Detect inverter presets (Kehua 15/20 kW, SMA 15 kW, Huawei 30 kW) and resolve initial/blank datasheets
// ---

import type { ChecklistItem, PVDatasheet } from '../types/schema';
import { DEFAULT_DATASHEET } from '../constants/defaultData';

export interface InverterDatasheetPreset {
  label: string;
  datasheet: PVDatasheet;
}

const KEHUA_BASE: Omit<PVDatasheet, 'numberOfModules'> = {
  nominalPower: '330 Wp',
  ratedVoltageVmp: '38,94 V',
  openCircuitVoltageVoc: '45,94 V',
  ratedCurrentImp: '8,47 A',
  shortCircuitCurrentIsc: '8,95 A',
  maximumSystemVoltage: '1.500',
};

const SMA_15_KW_DATASHEET: PVDatasheet = {
  nominalPower: '250 Wp',
  ratedVoltageVmp: '30,626 V',
  openCircuitVoltageVoc: '37,534 V',
  ratedCurrentImp: '8,229 A',
  shortCircuitCurrentIsc: '8,81 A',
  maximumSystemVoltage: '1.500',
  numberOfModules: '63 unit',
};

const HUAWEI_30_KW_DATASHEET: PVDatasheet = {
  nominalPower: '450 Wp',
  ratedVoltageVmp: '41,5 V',
  openCircuitVoltageVoc: '49,3 V',
  ratedCurrentImp: '10,85 A',
  shortCircuitCurrentIsc: '11,6 A',
  maximumSystemVoltage: '1.500',
  numberOfModules: '72 unit',
};

function extractKwFromText(text: string): number | null {
  if (!text) return null;
  const kwMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:kwp|kw|kva|ktl)\b/i);
  if (kwMatch) {
    const val = parseFloat(kwMatch[1].replace(',', '.'));
    return val > 0 ? Math.round(val) : null;
  }

  // Normalize Indonesian thousands separator like "15.000 W" -> "15000 W"
  const normalized = text.replace(/(\d)\.(\d{3})\b/g, '$1$2');
  const wMatch =
    normalized.match(/(\d+(?:[.,]\d+)?)\s*w\b/i) || normalized.match(/\b(\d{4,6})\b/);
  if (wMatch) {
    const val = parseFloat(wMatch[1].replace(',', '.'));
    if (val >= 1000) return Math.round(val / 1000);
    return val > 0 ? Math.round(val) : null;
  }

  const bareMatch = text.match(/\b(15|20|30)\b/);
  return bareMatch ? parseInt(bareMatch[1], 10) : null;
}

export function isDatasheetEmpty(ds?: PVDatasheet | null): boolean {
  if (!ds) return true;
  return (
    !ds.nominalPower?.trim() &&
    !ds.ratedVoltageVmp?.trim() &&
    !ds.openCircuitVoltageVoc?.trim() &&
    !ds.ratedCurrentImp?.trim() &&
    !ds.shortCircuitCurrentIsc?.trim() &&
    !ds.maximumSystemVoltage?.trim() &&
    !ds.numberOfModules?.trim()
  );
}

export function areDatasheetsEqual(a: PVDatasheet, b: PVDatasheet): boolean {
  return (
    a.nominalPower === b.nominalPower &&
    a.ratedVoltageVmp === b.ratedVoltageVmp &&
    a.openCircuitVoltageVoc === b.openCircuitVoltageVoc &&
    a.ratedCurrentImp === b.ratedCurrentImp &&
    a.shortCircuitCurrentIsc === b.shortCircuitCurrentIsc &&
    a.maximumSystemVoltage === b.maximumSystemVoltage &&
    a.numberOfModules === b.numberOfModules
  );
}

export function getDatasheetPresetForChecklist(
  checklist: ChecklistItem[]
): InverterDatasheetPreset | null {
  const brandText = checklist.find((c) => c.no === '4.1')?.deskripsi?.trim() || '';
  const capText = checklist.find((c) => c.no === '4.2')?.deskripsi?.trim() || '';
  if (!brandText) return null;

  const modelKwMatch = brandText.match(/(\d+(?:[.,]\d+)?)\s*(?:kwp|kw|kva|ktl)\b/i);
  const modelKw = modelKwMatch
    ? Math.round(parseFloat(modelKwMatch[1].replace(',', '.')))
    : null;
  const kw = modelKw || extractKwFromText(capText) || extractKwFromText(brandText);

  if (/(?:kehua|keyhua)/i.test(brandText)) {
    if (kw === 15) {
      return {
        label: 'Kehua 15 KW',
        datasheet: { ...KEHUA_BASE, numberOfModules: '48 unit' },
      };
    }
    if (kw === 20) {
      return {
        label: 'Kehua 20 KW',
        datasheet: { ...KEHUA_BASE, numberOfModules: '63 unit' },
      };
    }
    return null;
  }

  if (/\bsma\b/i.test(brandText) && kw === 15) {
    return {
      label: 'SMA 15 KW',
      datasheet: { ...SMA_15_KW_DATASHEET },
    };
  }

  if (/huawei/i.test(brandText) && kw === 30) {
    return {
      label: 'Huawei 30 KW',
      datasheet: { ...HUAWEI_30_KW_DATASHEET },
    };
  }

  return null;
}

export function resolveInitialDatasheet(
  checklist: ChecklistItem[],
  saved?: PVDatasheet | null
): PVDatasheet {
  if (saved && !isDatasheetEmpty(saved)) {
    return saved;
  }
  return getDatasheetPresetForChecklist(checklist)?.datasheet ?? DEFAULT_DATASHEET;
}

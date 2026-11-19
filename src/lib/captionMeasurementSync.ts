// ---
// Summary:
// - Purpose: Parse measurement values from PhotoCard captions and sync them into ElectricalMeasurement rows
// - Role: Client-side domain utility (runs locally in browser, zero backend overhead)
// - Depends on: src/types/schema.ts
// - Key Responsibilities: Extract Vmpp, Impp, Voc, Irradiance, AC voltage/current/frequency, and Grounding values from photo captions
// ---

import type { ElectricalMeasurement, PhotoSlot } from '../types/schema';

type MeasurementMatchTarget =
  | { kind: 'id'; id: string }
  | { kind: 'dc_vmp' | 'dc_imp' | 'dc_voc' | 'dc_irr'; stringNum: number };

interface ExtractedMeasurement {
  target: MeasurementMatchTarget;
  value: string;
}

const NUM = '(-?\\d+(?:[.,]\\d+)?)';

const AC_PATTERNS: Array<{ id: string; regex: RegExp }> = [
  { id: 'ac_v_rn', regex: new RegExp(`(?:netral\\s*[-–]\\s*fasa\\s*r|fasa\\s*r\\s*[-–]\\s*netral)[^=]*=\\s*${NUM}`, 'i') },
  { id: 'ac_v_sn', regex: new RegExp(`(?:netral\\s*[-–]\\s*fasa\\s*s|fasa\\s*s\\s*[-–]\\s*netral)[^=]*=\\s*${NUM}`, 'i') },
  { id: 'ac_v_tn', regex: new RegExp(`(?:netral\\s*[-–]\\s*fasa\\s*t|fasa\\s*t\\s*[-–]\\s*netral)[^=]*=\\s*${NUM}`, 'i') },
  { id: 'ac_v_ng', regex: new RegExp(`(?:netral\\s*[-–]\\s*ground(?:ing)?|ground(?:ing)?\\s*[-–]\\s*netral)[^=]*=\\s*${NUM}`, 'i') },
  { id: 'ac_v_rs', regex: new RegExp(`fasa\\s*r\\s*[-–]\\s*(?:fasa\\s*)?s[^=]*=\\s*${NUM}`, 'i') },
  { id: 'ac_v_rt', regex: new RegExp(`fasa\\s*r\\s*[-–]\\s*(?:fasa\\s*)?t[^=]*=\\s*${NUM}`, 'i') },
  { id: 'ac_v_st', regex: new RegExp(`fasa\\s*s\\s*[-–]\\s*(?:fasa\\s*)?t[^=]*=\\s*${NUM}`, 'i') },
  { id: 'ac_i_r', regex: new RegExp(`arus\\s*fasa\\s*r\\b[^=]*=\\s*${NUM}`, 'i') },
  { id: 'ac_i_s', regex: new RegExp(`arus\\s*fasa\\s*s\\b[^=]*=\\s*${NUM}`, 'i') },
  { id: 'ac_i_t', regex: new RegExp(`arus\\s*fasa\\s*t\\b[^=]*=\\s*${NUM}`, 'i') },
  { id: 'ac_freq', regex: new RegExp(`fre[kq]uensi[^=]*=\\s*${NUM}`, 'i') },
  { id: 'ground_r', regex: new RegExp(`tahanan\\s*grounding[^=]*=\\s*${NUM}`, 'i') },
];

const VMP_STRING_RE = /\bvmpp?\b[^0-9]*string\s*(\d+)|string\s*(\d+)[^=]*\bvmpp?\b/i;
const IMP_STRING_RE = /\bimpp?\b[^0-9]*string\s*(\d+)|string\s*(\d+)[^=]*\bimpp?\b/i;
const VMP_VAL_RE = new RegExp(`\\bvmpp?\\s*=\\s*${NUM}`, 'i');
const IMP_VAL_RE = new RegExp(`\\bimpp?\\s*=\\s*${NUM}`, 'i');
const GENERIC_EQ_VAL_RE = new RegExp(`=\\s*${NUM}`);
const STRING_NUM_RE = /\bstring\s*(\d+)\b/i;
const VOC_VAL_RE = new RegExp(`\\bvoc\\s*=\\s*${NUM}`, 'i');
const IRR_VAL_RE = new RegExp(`\\birr(?:adiance)?\\s*=\\s*${NUM}`, 'i');

export function extractMeasurementsFromCaption(caption: string): ExtractedMeasurement[] {
  const text = (caption || '').trim();
  if (!text || !text.includes('=')) return [];

  const results: ExtractedMeasurement[] = [];

  const vmpStr = text.match(VMP_STRING_RE);
  if (vmpStr) {
    const stringNum = Number(vmpStr[1] || vmpStr[2]);
    const valMatch = text.match(VMP_VAL_RE) || text.match(GENERIC_EQ_VAL_RE);
    if (stringNum > 0 && valMatch?.[1]) {
      results.push({ target: { kind: 'dc_vmp', stringNum }, value: valMatch[1] });
    }
    return results;
  }

  const impStr = text.match(IMP_STRING_RE);
  if (impStr) {
    const stringNum = Number(impStr[1] || impStr[2]);
    const valMatch = text.match(IMP_VAL_RE) || text.match(GENERIC_EQ_VAL_RE);
    if (stringNum > 0 && valMatch?.[1]) {
      results.push({ target: { kind: 'dc_imp', stringNum }, value: valMatch[1] });
    }
    return results;
  }

  const strMatch = text.match(STRING_NUM_RE);
  if (strMatch) {
    const stringNum = Number(strMatch[1]);
    const vocMatch = text.match(VOC_VAL_RE);
    const irrMatch = text.match(IRR_VAL_RE);
    if (stringNum > 0) {
      if (vocMatch?.[1]) {
        results.push({ target: { kind: 'dc_voc', stringNum }, value: vocMatch[1] });
      }
      if (irrMatch?.[1]) {
        results.push({ target: { kind: 'dc_irr', stringNum }, value: irrMatch[1] });
      }
      if (results.length > 0) return results;
    }
  }

  for (const { id, regex } of AC_PATTERNS) {
    const match = text.match(regex);
    if (match?.[1]) {
      results.push({ target: { kind: 'id', id }, value: match[1] });
      return results;
    }
  }

  return results;
}

function findMeasurementIndex(
  measurements: ElectricalMeasurement[],
  target: MeasurementMatchTarget
): number {
  if (target.kind === 'id') {
    return measurements.findIndex((m) => m.id === target.id);
  }

  const strRegex = new RegExp(`\\bstring\\s*${target.stringNum}\\b`, 'i');

  if (target.kind === 'dc_vmp') {
    const exactId = `dc_vmp_${target.stringNum}`;
    const byId = measurements.findIndex((m) => m.id === exactId);
    if (byId !== -1) return byId;
    return measurements.findIndex(
      (m) => m.id.startsWith('dc_vmp_') && strRegex.test(m.parameter)
    );
  }

  if (target.kind === 'dc_imp') {
    const exactId = `dc_imp_${target.stringNum}`;
    const byId = measurements.findIndex((m) => m.id === exactId);
    if (byId !== -1) return byId;
    return measurements.findIndex(
      (m) => m.id.startsWith('dc_imp_') && strRegex.test(m.parameter)
    );
  }

  if (target.kind === 'dc_voc') {
    return measurements.findIndex(
      (m) =>
        m.id.startsWith('dc_voc_') &&
        strRegex.test(m.parameter) &&
        /\bvoc\b/i.test(m.parameter)
    );
  }

  return measurements.findIndex(
    (m) =>
      m.id.startsWith('dc_voc_') &&
      strRegex.test(m.parameter) &&
      /\birr/i.test(m.parameter)
  );
}

export function applyCaptionToMeasurements(
  measurements: ElectricalMeasurement[],
  phaseKey: PhotoSlot['phaseKey'],
  caption: string
): ElectricalMeasurement[] {
  if (phaseKey !== 'pre_measure' && phaseKey !== 'post_measure') {
    return measurements;
  }

  const extracted = extractMeasurementsFromCaption(caption);
  if (extracted.length === 0) return measurements;

  const field = phaseKey === 'pre_measure' ? 'hasilBefore' : 'hasilAfter';
  let next: ElectricalMeasurement[] | null = null;

  for (const item of extracted) {
    const idx = findMeasurementIndex(measurements, item.target);
    if (idx === -1) continue;
    const current = (next ?? measurements)[idx];
    if (current[field] === item.value) continue;
    if (!next) next = [...measurements];
    next[idx] = { ...current, [field]: item.value };
  }

  return next ?? measurements;
}

export function syncMeasurementsFromPhaseCaptions(
  measurements: ElectricalMeasurement[],
  photoSlots: Record<string, PhotoSlot>,
  mode: 'before' | 'after'
): { measurements: ElectricalMeasurement[]; updatedCount: number } {
  const targetPhase: PhotoSlot['phaseKey'] = mode === 'before' ? 'pre_measure' : 'post_measure';
  const field = mode === 'before' ? 'hasilBefore' : 'hasilAfter';
  let next = measurements;
  let updatedCount = 0;

  for (const slot of Object.values(photoSlots)) {
    if (slot.phaseKey !== targetPhase || slot.excludeFromDocx) continue;
    const extracted = extractMeasurementsFromCaption(slot.caption);
    for (const item of extracted) {
      const idx = findMeasurementIndex(next, item.target);
      if (idx === -1) continue;
      if (next[idx][field] === item.value) continue;
      if (next === measurements) next = [...measurements];
      next[idx] = { ...next[idx], [field]: item.value };
      updatedCount++;
    }
  }

  return { measurements: next, updatedCount };
}

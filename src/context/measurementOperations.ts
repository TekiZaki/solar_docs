// ---
// Summary:
// - Purpose: Pure helper functions for inserting, adding, updating, and deleting measurement items
// - Role: Domain operation helpers
// - Depends on: src/types/schema.ts
// - Key Responsibilities: Manage ordered insertion and removal of ElectricalMeasurement records
// - Notes: Kept pure and isolated to keep ReportContext line counts low and cyclomatic complexity minimal
// ---

import type { ElectricalMeasurement } from '../types/schema';

export function insertMeasurementInList(
  list: ElectricalMeasurement[],
  targetId: string,
  position: 'before' | 'after',
  initialData?: Partial<ElectricalMeasurement>
): ElectricalMeasurement[] {
  const targetIdx = list.findIndex((m) => m.id === targetId);
  if (targetIdx === -1) return list;

  const target = list[targetIdx];
  let prefix = 'meas_';
  if (target.id.startsWith('dc_vmp_')) prefix = 'dc_vmp_';
  else if (target.id.startsWith('dc_imp_')) prefix = 'dc_imp_';
  else if (target.id.startsWith('dc_voc_')) prefix = 'dc_voc_';
  else if (target.id.startsWith('dc_')) prefix = 'dc_';
  else if (target.id.startsWith('ac_')) prefix = 'ac_';
  else if (target.id.startsWith('ground_')) prefix = 'ground_';

  const newId = `${prefix}custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;

  const newItem: ElectricalMeasurement = {
    id: newId,
    no: initialData?.no ?? '',
    parameter: initialData?.parameter ?? '',
    hasilBefore: initialData?.hasilBefore ?? '',
    hasilAfter: initialData?.hasilAfter ?? '',
  };

  const nextList = [...list];
  nextList.splice(insertIdx, 0, newItem);
  return nextList;
}

export function addMeasurementToList(
  list: ElectricalMeasurement[],
  group: 'dc_vmp' | 'dc_imp' | 'dc_voc' | 'dc' | 'ac' | 'ground',
  position: 'START' | 'END' = 'END',
  initialData?: Partial<ElectricalMeasurement>
): ElectricalMeasurement[] {
  const newId = `${group}_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const newItem: ElectricalMeasurement = {
    id: newId,
    no: initialData?.no ?? '',
    parameter: initialData?.parameter ?? '',
    hasilBefore: initialData?.hasilBefore ?? '',
    hasilAfter: initialData?.hasilAfter ?? '',
  };

  const matchingIndices = list
    .map((m, idx) => (m.id.startsWith(group) ? idx : -1))
    .filter((idx) => idx !== -1);

  const nextList = [...list];
  if (matchingIndices.length === 0) {
    if (position === 'START') nextList.unshift(newItem);
    else nextList.push(newItem);
  } else if (position === 'START') {
    nextList.splice(matchingIndices[0], 0, newItem);
  } else {
    nextList.splice(matchingIndices[matchingIndices.length - 1] + 1, 0, newItem);
  }
  return nextList;
}

export function deleteMeasurementFromList(
  list: ElectricalMeasurement[],
  id: string
): ElectricalMeasurement[] {
  return list.filter((m) => m.id !== id);
}

export function updateMeasurementInList(
  list: ElectricalMeasurement[],
  id: string,
  fields: Partial<ElectricalMeasurement>
): ElectricalMeasurement[] {
  return list.map((m) => (m.id === id ? { ...m, ...fields } : m));
}

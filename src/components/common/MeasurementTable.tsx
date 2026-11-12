// ---
// Summary:
// - Purpose: Reusable measurement table component for Phase II.II (Pra) and Phase II.IV (Pasca)
// - Role: UI table container component
// - Depends on: src/context/useReport.ts, src/constants/defaultData.ts, ./MeasurementTableRow.tsx
// - Key Responsibilities: Render DC and AC measurement panels with arbitrary row insertion, editing, and deletion
// - Notes: Follows Scandinavian design (clean table layout, monochrome borders, high contrast)
// ---

import React from 'react';
import { useReport } from '../../context/useReport';
import { EXAMPLE_MEASUREMENTS } from '../../constants/defaultData';
import { MeasurementTableRow } from './MeasurementTableRow';

const PHOTO_REFERENCE_HINTS: Record<string, string> = {
  dc_vmp_1: '(Pengukuran Tegangan Vmpp String 1)',
  dc_vmp_2: '(Pengukuran Tegangan Vmpp String 2)',
  dc_vmp_3: '(Pengukuran Tegangan Vmpp String 3)',
  dc_imp_1: '(Pengukuran Arus Impp String 1)',
  dc_imp_2: '(Pengukuran Arus Impp String 2)',
  dc_imp_3: '(Pengukuran Arus Impp String 3)',
};

interface MeasurementTableProps {
  mode: 'before' | 'after';
  title: string;
  subtitle?: string;
}

export const MeasurementTable: React.FC<MeasurementTableProps> = ({
  mode,
  title,
  subtitle,
}) => {
  const {
    state,
    updateMeasurement,
    insertMeasurement,
    addMeasurement,
    deleteMeasurement,
  } = useReport();

  const dcItems = state.measurements.filter((m) => m.id.startsWith('dc_'));
  const acItems = state.measurements.filter(
    (m) => m.id.startsWith('ac_') || m.id.startsWith('ground_')
  );

  const vmpItems = dcItems.filter((m) => m.id.startsWith('dc_vmp_'));
  const impItems = dcItems.filter((m) => m.id.startsWith('dc_imp_'));
  const vocItems = dcItems.filter((m) => m.id.startsWith('dc_voc_'));
  const otherDcItems = dcItems.filter(
    (m) =>
      !m.id.startsWith('dc_vmp_') &&
      !m.id.startsWith('dc_imp_') &&
      !m.id.startsWith('dc_voc_')
  );

  const handleAddVmp = () => {
    const nextIdx = vmpItems.length + 1;
    addMeasurement('dc_vmp', 'END', {
      no: `1.1.${nextIdx}`,
      parameter: `String ${nextIdx} [Vdc]`,
    });
  };

  const handleAddImp = () => {
    const nextIdx = impItems.length + 1;
    addMeasurement('dc_imp', 'END', {
      no: `1.2.${nextIdx}`,
      parameter: `String ${nextIdx} [Adc]`,
    });
  };

  const handleAddVoc = () => {
    const nextIdx = vocItems.length + 1;
    const pairNum = Math.floor((nextIdx - 1) / 2) + 1;
    const isVoc = nextIdx % 2 === 1;
    addMeasurement('dc_voc', 'END', {
      no: `1.3.${nextIdx}`,
      parameter: isVoc ? `String ${pairNum} Voc [Vdc]` : `String ${pairNum} Irradiance [w/m2]`,
    });
  };

  const handleAddAc = () => {
    addMeasurement('ac', 'END', {
      no: `2.${acItems.length + 1}`,
      parameter: '',
    });
  };

  const resultHeader = mode === 'before' ? 'HASIL (BEFORE)' : 'HASIL (AFTER)';
  const defaultSubtitle =
    'Baris dapat disisipkan di posisi mana pun (+↑ di atas, +↓ di bawah), diedit parameternya, atau dihapus.';

  return (
    <div className="bg-white border border-black rounded-lg p-4 sm:p-5 space-y-4 shadow-sm text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {subtitle || defaultSubtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* DC Side */}
        <div className="border border-black rounded-lg overflow-hidden bg-white">
          <div className="bg-blue-100 px-3 py-2 font-semibold text-xs text-slate-800 border-b border-black flex items-center justify-between">
            <span>1. PANEL DC COMBINER BOX</span>
            <span className="text-[11px] font-normal text-slate-600">
              Total {dcItems.length} baris
            </span>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-black">
              <tr>
                <th className="py-2 px-2 w-16">NO</th>
                <th className="py-2 px-2">PARAMETER</th>
                <th className="py-2 px-2 w-32">{resultHeader}</th>
                <th className="py-2 px-2 w-24">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* 1.1 Vmp Section */}
              <tr className="bg-slate-100/80 font-semibold text-slate-800">
                <td className="py-2 px-2 font-mono">1.1</td>
                <td className="py-2 px-2" colSpan={2}>
                  Tegangan daya Maksimum (Vmp)
                </td>
                <td className="py-1 px-2 text-right">
                  <button
                    type="button"
                    onClick={handleAddVmp}
                    className="text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-300 transition"
                    title="Tambah baris baru ke kelompok Vmp"
                  >
                    + Tambah
                  </button>
                </td>
              </tr>
              {vmpItems.map((m) => (
                <MeasurementTableRow
                  key={m.id}
                  item={m}
                  mode={mode}
                  placeholder={
                    mode === 'before'
                      ? EXAMPLE_MEASUREMENTS[m.id]?.before || ''
                      : EXAMPLE_MEASUREMENTS[m.id]?.after || ''
                  }
                  refHint={PHOTO_REFERENCE_HINTS[m.id]}
                  onUpdate={updateMeasurement}
                  onInsert={insertMeasurement}
                  onDelete={deleteMeasurement}
                />
              ))}

              {/* 1.2 Imp Section */}
              <tr className="bg-slate-100/80 font-semibold text-slate-800">
                <td className="py-2 px-2 font-mono">1.2</td>
                <td className="py-2 px-2" colSpan={2}>
                  Arus Daya Maksimum (Imp)
                </td>
                <td className="py-1 px-2 text-right">
                  <button
                    type="button"
                    onClick={handleAddImp}
                    className="text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-300 transition"
                    title="Tambah baris baru ke kelompok Imp"
                  >
                    + Tambah
                  </button>
                </td>
              </tr>
              {impItems.map((m) => (
                <MeasurementTableRow
                  key={m.id}
                  item={m}
                  mode={mode}
                  placeholder={
                    mode === 'before'
                      ? EXAMPLE_MEASUREMENTS[m.id]?.before || ''
                      : EXAMPLE_MEASUREMENTS[m.id]?.after || ''
                  }
                  refHint={PHOTO_REFERENCE_HINTS[m.id]}
                  onUpdate={updateMeasurement}
                  onInsert={insertMeasurement}
                  onDelete={deleteMeasurement}
                />
              ))}

              {/* 1.3 Voc & Irradiance Section */}
              <tr className="bg-slate-100/80 font-semibold text-slate-800">
                <td className="py-2 px-2 font-mono">1.3</td>
                <td className="py-2 px-2" colSpan={2}>
                  Voc &amp; Irradiance String PV
                </td>
                <td className="py-1 px-2 text-right">
                  <button
                    type="button"
                    onClick={handleAddVoc}
                    className="text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-300 transition"
                    title="Tambah baris baru ke kelompok Voc & Irradiance"
                  >
                    + Tambah
                  </button>
                </td>
              </tr>
              {vocItems.map((m) => (
                <MeasurementTableRow
                  key={m.id}
                  item={m}
                  mode={mode}
                  placeholder={
                    mode === 'before'
                      ? EXAMPLE_MEASUREMENTS[m.id]?.before || ''
                      : EXAMPLE_MEASUREMENTS[m.id]?.after || ''
                  }
                  onUpdate={updateMeasurement}
                  onInsert={insertMeasurement}
                  onDelete={deleteMeasurement}
                />
              ))}

              {/* Other DC Items if added */}
              {otherDcItems.length > 0 && (
                <>
                  <tr className="bg-slate-100/80 font-semibold text-slate-800">
                    <td className="py-2 px-2 font-mono">1.4</td>
                    <td className="py-2 px-2" colSpan={3}>
                      Parameter DC Tambahan
                    </td>
                  </tr>
                  {otherDcItems.map((m) => (
                    <MeasurementTableRow
                      key={m.id}
                      item={m}
                      mode={mode}
                      placeholder="Nilai..."
                      onUpdate={updateMeasurement}
                      onInsert={insertMeasurement}
                      onDelete={deleteMeasurement}
                    />
                  ))}
                </>
              )}
            </tbody>
          </table>

          <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddVmp}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 px-2.5 py-1 rounded transition"
            >
              + Baris Vmp
            </button>
            <button
              type="button"
              onClick={handleAddImp}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 px-2.5 py-1 rounded transition"
            >
              + Baris Imp
            </button>
            <button
              type="button"
              onClick={handleAddVoc}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 px-2.5 py-1 rounded transition"
            >
              + Baris Voc
            </button>
          </div>
        </div>

        {/* AC & Grounding Side */}
        <div className="border border-black rounded-lg overflow-hidden bg-white">
          <div className="bg-blue-100 px-3 py-2 font-semibold text-xs text-slate-800 border-b border-black flex items-center justify-between">
            <span>2. PANEL AC COMBINER BOX & GROUNDING</span>
            <span className="text-[11px] font-normal text-slate-600">
              Total {acItems.length} baris
            </span>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-black">
              <tr>
                <th className="py-2 px-2 w-16">NO</th>
                <th className="py-2 px-2">PARAMETER</th>
                <th className="py-2 px-2 w-32">{resultHeader}</th>
                <th className="py-2 px-2 w-24">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {acItems.map((m) => (
                <MeasurementTableRow
                  key={m.id}
                  item={m}
                  mode={mode}
                  placeholder={
                    mode === 'before'
                      ? EXAMPLE_MEASUREMENTS[m.id]?.before || ''
                      : EXAMPLE_MEASUREMENTS[m.id]?.after || ''
                  }
                  onUpdate={updateMeasurement}
                  onInsert={insertMeasurement}
                  onDelete={deleteMeasurement}
                />
              ))}
            </tbody>
          </table>

          <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
            <button
              type="button"
              onClick={handleAddAc}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1 rounded transition"
            >
              + Tambah Baris AC / Grounding
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

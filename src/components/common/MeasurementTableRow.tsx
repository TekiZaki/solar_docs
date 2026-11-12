// ---
// Summary:
// - Purpose: Reusable editable row component for electrical measurement tables (Pra & Pasca)
// - Role: UI row presentation & action component
// - Depends on: src/types/schema.ts
// - Key Responsibilities: Provide editable NO, PARAMETER, and HASIL (before or after) inputs with row insertion and deletion actions
// - Notes: Follows Scandinavian design (restrained styling, clean borders, clear hover states)
// ---

import React from 'react';
import type { ElectricalMeasurement } from '../../types/schema';

interface MeasurementTableRowProps {
  item: ElectricalMeasurement;
  mode: 'before' | 'after';
  placeholder?: string;
  refHint?: string;
  onUpdate: (id: string, fields: Partial<ElectricalMeasurement>) => void;
  onInsert: (id: string, position: 'before' | 'after') => void;
  onDelete: (id: string) => void;
}

export const MeasurementTableRow: React.FC<MeasurementTableRowProps> = ({
  item,
  mode,
  placeholder = '',
  refHint,
  onUpdate,
  onInsert,
  onDelete,
}) => {
  const handleDelete = () => {
    const isCustom = item.id.includes('custom');
    if (isCustom || window.confirm(`Hapus baris "${item.no || item.parameter || 'Pengukuran'}"?`)) {
      onDelete(item.id);
    }
  };

  const hasilValue = mode === 'before' ? item.hasilBefore : item.hasilAfter;
  const handleHasilChange = (val: string) => {
    onUpdate(item.id, mode === 'before' ? { hasilBefore: val } : { hasilAfter: val });
  };

  return (
    <tr className="hover:bg-slate-50/60 transition group">
      <td className="py-1.5 px-2 font-mono text-slate-700 align-top pt-2 w-16">
        <input
          type="text"
          value={item.no}
          onChange={(e) => onUpdate(item.id, { no: e.target.value })}
          placeholder="No"
          className="w-14 text-xs font-mono px-1.5 py-1 rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
        />
      </td>

      <td className="py-1.5 px-2 align-top pt-2">
        <div className="space-y-0.5">
          <input
            type="text"
            value={item.parameter}
            onChange={(e) => onUpdate(item.id, { parameter: e.target.value })}
            placeholder="Nama parameter..."
            className="w-full text-xs px-2 py-1 rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800"
          />
          {refHint && (
            <span className="text-[11px] text-slate-400 block font-normal leading-tight">
              {refHint}
            </span>
          )}
        </div>
      </td>

      <td className="py-1.5 px-2 align-top pt-2 w-32">
        <input
          type="text"
          value={hasilValue}
          onChange={(e) => handleHasilChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs font-mono font-medium px-2 py-1 rounded border border-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
        />
      </td>

      <td className="py-1.5 px-2 align-top pt-2 w-24">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onInsert(item.id, 'before')}
            title="Sisipkan baris baru di atas baris ini"
            className="px-1.5 py-0.5 text-[11px] font-mono font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition"
          >
            +↑
          </button>
          <button
            type="button"
            onClick={() => onInsert(item.id, 'after')}
            title="Sisipkan baris baru di bawah baris ini"
            className="px-1.5 py-0.5 text-[11px] font-mono font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition"
          >
            +↓
          </button>
          <button
            type="button"
            onClick={handleDelete}
            title="Hapus baris ini"
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
};

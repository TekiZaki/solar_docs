// ---
// Summary:
// - Purpose: Reusable card for inputting execution date, time, and weather conditions per maintenance phase
// - Role: Presentation component
// - Depends on: src/types/schema.ts, src/lib/dateUtils.ts
// - Key Responsibilities: Provide calendar modal, clock picker, and quick "Sekarang" button for realization schedule
// - Notes: Satisfies phase-specific realization date requirement without manual typing
// ---

import React from 'react';
import type { RealizationDate } from '../../types/schema';
import {
  formatDateTimeToIndonesian,
  parseIndonesianToDateTime,
  getNowIndonesianDateTime,
} from '../../lib/dateUtils';
import { DateTimePicker } from './DateTimePicker';

interface RealizationDateCardProps {
  data: RealizationDate;
  index: number;
  onUpdate: (index: number, fields: Partial<RealizationDate>) => void;
  badgeLabel?: string;
  note?: string;
}

export const RealizationDateCard: React.FC<RealizationDateCardProps> = ({
  data,
  index,
  onUpdate,
  badgeLabel,
  note,
}) => {
  const isoDateTime = parseIndonesianToDateTime(data.tanggalPelaksanaan);

  const handleCustomDateTimePicked = (isoVal: string) => {
    if (isoVal) {
      onUpdate(index, { tanggalPelaksanaan: formatDateTimeToIndonesian(isoVal) });
    }
  };

  const handleSetNow = () => {
    onUpdate(index, { tanggalPelaksanaan: getNowIndonesianDateTime() });
  };

  return (
    <div className="bg-gray-600 border border-slate-200 rounded-lg p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          {badgeLabel && (
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
              {badgeLabel}
            </span>
          )}
          <h3 className="text-xs font-semibold text-white">{data.label}</h3>
        </div>
        {note && <span className="text-[11px] text-white">{note}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1 min-h-[24px]">
            <label className="block text-xs font-medium text-white">
              Tanggal & Jam Pelaksanaan (WIB)
            </label>
            <button
              type="button"
              onClick={handleSetNow}
              className="h-6 inline-flex items-center justify-center whitespace-nowrap text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 rounded transition shadow-sm"
              title="Isi dengan tanggal dan jam saat ini"
            >
              Sekarang
            </button>
          </div>

          <div className="space-y-1.5">
            <input
              type="text"
              value={data.tanggalPelaksanaan}
              onChange={(e) => onUpdate(index, { tanggalPelaksanaan: e.target.value })}
              placeholder="Contoh: 5 September 2026 09:00 WIB"
              className="w-full h-8 text-xs px-3 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white whitespace-nowrap">Pilih dari Kalender:</span>
              <div className="flex-1 min-w-0">
                <DateTimePicker
                  value={isoDateTime}
                  onChange={handleCustomDateTimePicked}
                  placeholder="Pilih jadwal..."
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1 min-h-[24px]">
            <label className="block text-xs font-medium text-white">
              Kondisi Cuaca
            </label>
            <div className="flex items-center gap-1 flex-wrap">
              {['Cerah', 'Cerah Berawan', 'Berawan', 'Hujan'].map((weather) => (
                <button
                  key={weather}
                  type="button"
                  onClick={() => onUpdate(index, { kondisiCuaca: weather })}
                  className={`h-6 inline-flex items-center justify-center whitespace-nowrap text-[11px] px-2 rounded font-medium transition shadow-sm ${
                    data.kondisiCuaca === weather
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {weather}
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            value={data.kondisiCuaca}
            onChange={(e) => onUpdate(index, { kondisiCuaca: e.target.value })}
            placeholder="Contoh: Cerah Berawan"
            className="w-full h-8 text-xs px-3 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </div>
    </div>
  );
};

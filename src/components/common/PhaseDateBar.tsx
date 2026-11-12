// ---
// Summary:
// - Purpose: Bulk date setter bar for all photo slots within a maintenance phase
// - Role: Presentation component
// - Depends on: src/context/useReport.ts, src/lib/dateUtils.ts
// - Key Responsibilities: Provide calendar picker and quick "Hari Ini" button to batch-update photo dates across the active phase
// - Notes: Eliminates repetitive date entry for on-site technicians
// ---

import React, { useState, useEffect } from 'react';
import { useReport } from '../../context/useReport';
import {
  formatDateToIndonesian,
  parseIndonesianToDate,
  getTodayIsoDate,
  getTodayIndonesianDate,
} from '../../lib/dateUtils';
import { DateTimePicker } from './DateTimePicker';

interface PhaseDateBarProps {
  phaseKey: string;
  phaseTitle: string;
}

export const PhaseDateBar: React.FC<PhaseDateBarProps> = ({ phaseKey, phaseTitle }) => {
  const { state, setPhasePhotosDate } = useReport();

  const getPhaseRealizationDate = () => {
    if (phaseKey === 'physical' || phaseKey === 'pre_measure') {
      return state.realizationDates.find((r) => r.phase === 'pra') || state.realizationDates[0];
    }
    if (phaseKey === 'cleaning') {
      return state.realizationDates.find((r) => r.phase === 'pembersihan') || state.realizationDates[1];
    }
    if (phaseKey === 'post_measure') {
      return state.realizationDates.find((r) => r.phase === 'pasca') || state.realizationDates[2];
    }
    return undefined;
  };

  const relDate = getPhaseRealizationDate();
  const relIsoDate = relDate ? parseIndonesianToDate(relDate.tanggalPelaksanaan) : '';

  const [selectedIsoDate, setSelectedIsoDate] = useState<string>(
    relIsoDate || getTodayIsoDate()
  );

  useEffect(() => {
    if (relIsoDate) {
      setSelectedIsoDate(relIsoDate);
    }
  }, [relIsoDate]);

  const handleApplyToAll = () => {
    const formatted = formatDateToIndonesian(selectedIsoDate);
    if (formatted) {
      setPhasePhotosDate(phaseKey, formatted);
    }
  };

  const handleApplyToday = () => {
    const todayIso = getTodayIsoDate();
    setSelectedIsoDate(todayIso);
    setPhasePhotosDate(phaseKey, getTodayIndonesianDate());
  };

  return (
    <div className="bg-gray-600 border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="font-semibold text-white">
          Atur Tanggal Foto {phaseTitle}:
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-36 sm:w-40">
          <DateTimePicker
            mode="date"
            value={selectedIsoDate}
            onChange={(val) => setSelectedIsoDate(val)}
            placeholder="Pilih tanggal..."
          />
        </div>
        <button
          type="button"
          onClick={handleApplyToAll}
          className="h-8 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-3 rounded transition shadow-sm whitespace-nowrap inline-flex items-center justify-center"
          title="Terapkan tanggal terpilih ke semua foto di tahap ini"
        >
          Terapkan ke Semua Foto
        </button>
        <button
          type="button"
          onClick={handleApplyToday}
          className="h-8 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-xs px-3 rounded transition shadow-sm whitespace-nowrap inline-flex items-center justify-center"
          title="Terapkan tanggal hari ini ke semua foto di tahap ini"
        >
          Hari Ini
        </button>
      </div>
    </div>
  );
};

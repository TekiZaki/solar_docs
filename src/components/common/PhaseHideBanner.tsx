import React from 'react';
import type { MaintenancePhaseKey } from '../../types/schema';
import { useReport } from '../../context/useReport';

interface PhaseHideBannerProps {
  phaseKey: MaintenancePhaseKey;
  phaseLabel: string;
}

export const PhaseHideToggleButton: React.FC<PhaseHideBannerProps> = ({
  phaseKey,
  phaseLabel,
}) => {
  const { state, setPhaseHidden } = useReport();
  const isHidden = Boolean(state.hiddenPhases?.includes(phaseKey));

  return (
    <button
      type="button"
      onClick={() => setPhaseHidden(phaseKey, !isHidden)}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${
        isHidden
          ? 'bg-amber-100 text-amber-900 border-amber-400 hover:bg-amber-200'
          : 'bg-white text-slate-700 border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
      }`}
      title={isHidden ? `Tampilkan kembali ${phaseLabel}` : `Hilangkan ${phaseLabel} dari laporan dan DOCX`}
    >
      {isHidden ? 'Tampilkan Tahap Ini' : 'Hilangkan Tahap Ini'}
    </button>
  );
};

export const PhaseHideBanner: React.FC<PhaseHideBannerProps> = ({
  phaseKey,
  phaseLabel,
}) => {
  const { state, setPhaseHidden } = useReport();
  const isHidden = Boolean(state.hiddenPhases?.includes(phaseKey));
  if (!isHidden) return null;

  return (
    <div className="bg-amber-50 border border-amber-400 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950">
      <span>
        <strong>{phaseLabel}</strong> sedang dihilangkan. Tahap ini tidak dihitung pada daftar kelengkapan dan tidak disertakan saat ekspor DOCX.
      </span>
      <button
        type="button"
        onClick={() => setPhaseHidden(phaseKey, false)}
        className="self-start sm:self-auto shrink-0 font-semibold px-3 py-1 rounded border border-amber-400 bg-white hover:bg-amber-100 text-amber-900 transition"
      >
        Tampilkan Kembali
      </button>
    </div>
  );
};

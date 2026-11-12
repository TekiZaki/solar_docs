// ---
// Summary:
// - Purpose: Informational guide panel for electrical measurements (Pra & Pasca)
// - Role: Presentational UI component
// - Depends on: none
// - Key Responsibilities: Display clear hierarchical mapping for Vmp and Imp strings to their documentation photo names
// - Notes: Follows Scandinavian design principles (minimal, calm, clear hierarchy)
// ---

import React from 'react';

export const MeasurementInfoGuide: React.FC = () => {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3 text-left">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M24.01 6.797a1.34 1.34 0 0 0-1.034-.487h-.035.002-3.441l.954-4.643A1.4 1.4 0 0 0 20.188.48l.002.003a1.35 1.35 0 0 0-1.036-.486h-.033.002c-.9.029-1.643.665-1.835 1.51l-.003.013-.259 1.262c-.008.032-.022.062-.029.094l-.708 3.435h-5.793l.954-4.643a1.4 1.4 0 0 0-.268-1.187l.002.003a1.35 1.35 0 0 0-1.036-.486h-.033.002c-.9.029-1.643.665-1.835 1.51l-.003.013-.27 1.313c0 .015-.01.028-.013.042l-.702 3.435H3.547c-.9.029-1.643.664-1.836 1.509l-.003.013a1.4 1.4 0 0 0 .267 1.188l-.002-.003c.248.298.619.487 1.035.487h.034-.002 3.597l-1.022 4.97H1.864c-.9.029-1.643.665-1.836 1.51l-.003.013a1.4 1.4 0 0 0 .267 1.185L.29 17.18c.249.298.62.487 1.036.487h.034-.002 3.597l-.96 4.668a1.4 1.4 0 0 0 .268 1.187l-.002-.003c.249.298.62.487 1.036.487h.033-.002a1.95 1.95 0 0 0 1.836-1.51l.003-.013.99-4.814h5.796l-.96 4.668a1.4 1.4 0 0 0 .268 1.187l-.002-.003c.249.298.62.486 1.036.486h.033-.002a1.945 1.945 0 0 0 1.835-1.51l.003-.013.99-4.814h3.6a1.95 1.95 0 0 0 1.836-1.509l.003-.013a1.39 1.39 0 0 0-.263-1.188l.002.003a1.35 1.35 0 0 0-1.037-.487h-.036.002-3.447l1.022-4.97h3.6a1.95 1.95 0 0 0 1.836-1.51l.003-.013a1.4 1.4 0 0 0-.268-1.188l.002.003zM8.819 14.472l1.022-4.97h5.796l-1.022 4.97z"/></svg>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
          Informasi Parameter Pengukuran (DC Combiner Box)
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* 1.1 Vmp */}
        <div className="bg-white p-3.5 rounded border border-slate-200/80 space-y-2 shadow-sm">
          <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center justify-between">
            <span>1.1 Tegangan daya Maksimum (Vmp)</span>
            <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
              Vdc
            </span>
          </div>
          <ul className="space-y-1.5 text-slate-700">
            <li className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <span className="font-mono font-medium text-slate-900">1.1.1 String 1 [Vdc]</span>
              <span className="text-[11px] text-slate-500 font-sans">
                (Pengukuran Tegangan Vmpp String 1)
              </span>
            </li>
            <li className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <span className="font-mono font-medium text-slate-900">1.1.2 String 2 [Vdc]</span>
              <span className="text-[11px] text-slate-500 font-sans">
                (Pengukuran Tegangan Vmpp String 2)
              </span>
            </li>
            <li className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <span className="font-mono font-medium text-slate-900">1.1.3 String 3 [Vdc]</span>
              <span className="text-[11px] text-slate-500 font-sans">
                (Pengukuran Tegangan Vmpp String 3)
              </span>
            </li>
          </ul>
        </div>

        {/* 1.2 Imp */}
        <div className="bg-white p-3.5 rounded border border-slate-200/80 space-y-2 shadow-sm">
          <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center justify-between">
            <span>1.2 Arus Daya Maksimum (Imp)</span>
            <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
              Adc
            </span>
          </div>
          <ul className="space-y-1.5 text-slate-700">
            <li className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <span className="font-mono font-medium text-slate-900">1.2.1 String 1 [Adc]</span>
              <span className="text-[11px] text-slate-500 font-sans">
                (Pengukuran Arus Impp String 1)
              </span>
            </li>
            <li className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <span className="font-mono font-medium text-slate-900">1.2.2 String 2 [Adc]</span>
              <span className="text-[11px] text-slate-500 font-sans">
                (Pengukuran Arus Impp String 2)
              </span>
            </li>
            <li className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <span className="font-mono font-medium text-slate-900">1.2.3 String 3 [Adc]</span>
              <span className="text-[11px] text-slate-500 font-sans">
                (Pengukuran Arus Impp String 3)
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

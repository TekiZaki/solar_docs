// ---
// Summary:
// - Purpose: Navigation bar for switching between maintenance phases
// - Role: Layout navigation component
// - Depends on: src/context/ReportContext.tsx
// - Key Responsibilities: Provide clean tabs with photo completion counters and II.x. nomenclature
// - Notes: Designed with generous whitespace and clear active states
// ---

import React from 'react';
import { useReport } from '../../context/useReport';

export type PhaseTab =
  | 'general'
  | 'physical'
  | 'pre_measure'
  | 'cleaning'
  | 'post_measure'
  | 'analysis'
  | 'damage_rec';

interface PhaseNavProps {
  currentTab: PhaseTab;
  onSelectTab: (tab: PhaseTab) => void;
}

export const PhaseNav: React.FC<PhaseNavProps> = ({ currentTab, onSelectTab }) => {
  const { state } = useReport();

  const getPhasePhotoCount = (phaseKey: string) => {
    const slots = Object.values(state.photoSlots).filter((s) => s.phaseKey === phaseKey);
    const uploaded = slots.filter((s) => s.isUploaded).length;
    return { uploaded, total: slots.length };
  };

  const generalStats = getPhasePhotoCount('general');
  const physicalStats = getPhasePhotoCount('physical');
  const preStats = getPhasePhotoCount('pre_measure');
  const clnStats = getPhasePhotoCount('cleaning');
  const postStats = getPhasePhotoCount('post_measure');

  const tabs: { id: PhaseTab; label: string; sub: string; badge?: string }[] = [
    {
      id: 'general',
      label: 'Lokasi & Jadwal',
      sub: 'Informasi Umum',
      badge: `${generalStats.uploaded}/${generalStats.total}`,
    },
    {
      id: 'physical',
      label: 'II.I. Fisik',
      sub: 'Pengecekan Instalasi',
      badge: `${physicalStats.uploaded}/${physicalStats.total}`,
    },
    {
      id: 'pre_measure',
      label: 'II.II. Pra',
      sub: 'Pengukuran Pra',
      badge: `${preStats.uploaded}/${preStats.total}`,
    },
    {
      id: 'cleaning',
      label: 'II.III. Cuci',
      sub: 'Pembersihan PV',
      badge: `${clnStats.uploaded}/${clnStats.total}`,
    },
    {
      id: 'post_measure',
      label: 'II.IV. Pasca',
      sub: 'Pengukuran Pasca',
      badge: `${postStats.uploaded}/${postStats.total}`,
    },
    {
      id: 'analysis',
      label: 'III. Analisa',
      sub: 'Komparasi & STC',
    },
    {
      id: 'damage_rec',
      label: 'IV. Hasil',
      sub: 'Kesimpulan & Rekomendasi',
    },
  ];

  return (
    <div className="bg-white border-b border-black">
      <div className="w-full md:w-[90vw] min-w-90vw mx-auto px-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-1 py-2 min-w-max">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex flex-col items-start px-3 py-2 rounded-lg text-left transition border ${
                  isActive
                    ? 'bg-slate-900 text-white border-blue-blue'
                    : 'bg-white text-slate-700 border-black hover:bg-slate-50 hover:border-blue-500'
                }`}
              >
                <div className="flex items-center gap-1.5 w-full">
                  <span className="font-semibold text-xs whitespace-nowrap">{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive
                          ? 'bg-slate-800 text-slate-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] whitespace-nowrap mt-0.5 ${
                    isActive ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

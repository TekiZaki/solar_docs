// ---
// Summary:
// - Purpose: Custom dropdown component for selecting project report files with clean two-row layout
// - Role: UI Select Component
// - Depends on: src/context/reportContextInstance.ts
// - Key Responsibilities: Display file name on top row and secondary metadata on bottom row
// ---

import React, { useState, useRef, useEffect } from 'react';
import type { ReportSummary } from '../../context/reportContextInstance';

interface ProjectFileSelectProps {
  reports: ReportSummary[];
  selectedId: string;
  activeReportId?: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export const ProjectFileSelect: React.FC<ProjectFileSelectProps> = ({
  reports,
  selectedId,
  activeReportId,
  onSelect,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedReport = reports.find((r) => r.id === selectedId);

  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredReports = reports.filter((rep) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchId = rep.id.toLowerCase().includes(q);
    const matchLokasi = (rep.lokasi || '').toLowerCase().includes(q);
    const matchName = (rep.name || '').toLowerCase().includes(q);
    return matchId || matchLokasi || matchName;
  });

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full h-10 px-3 rounded border border-slate-300 bg-white hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 flex items-center justify-between shadow-sm transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex flex-col justify-center min-w-0 pr-2">
          <span className="text-xs font-semibold text-slate-900 truncate leading-tight">
            {selectedReport?.name || selectedId || 'Pilih Berkas...'}
          </span>
          <span className="text-[10px] text-slate-500 truncate leading-tight">
            {selectedReport
              ? `${selectedReport.lokasi ? `${selectedReport.lokasi} • ` : ''}${selectedReport.photoCount} foto • ${selectedReport.fileSizeKb} KB${
                  selectedReport.id === activeReportId ? ' • Aktif' : ''
                }`
              : selectedId}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-500 shrink-0 ml-1 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl z-50 overflow-hidden text-xs">
          <div className="p-2 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari lokasi atau ID berkas..."
                className="w-full h-8 pl-8 pr-7 text-xs rounded border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
              />
              <svg
                className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold px-1"
                  title="Hapus pencarian"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {filteredReports.length > 0 ? (
              filteredReports.map((rep) => {
                const isSelected = rep.id === selectedId;
                const isActive = rep.id === activeReportId;
                return (
                  <button
                    key={rep.id}
                    type="button"
                    onClick={() => {
                      onSelect(rep.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 transition flex flex-col justify-center gap-0.5 ${
                      isSelected ? 'bg-slate-100 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {rep.name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActive && (
                          <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded leading-none">
                            Sedang Aktif
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-slate-900 font-bold text-xs">✓</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                      {rep.lokasi ? (
                        <>
                          <span className="truncate max-w-[200px]">{rep.lokasi}</span>
                          <span>•</span>
                        </>
                      ) : null}
                      <span>{rep.photoCount} foto</span>
                      <span>•</span>
                      <span>{rep.fileSizeKb} KB</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-slate-500">
                {searchQuery
                  ? `Tidak ada berkas yang cocok dengan "${searchQuery}"`
                  : 'Tidak ada berkas laporan'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
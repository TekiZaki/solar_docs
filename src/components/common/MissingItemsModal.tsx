// ---
// Summary:
// - Purpose: Modal dialog displaying missing photos and data fields with a one-tap copy button for field chat groups
// - Role: Presentation dialog component
// - Depends on: src/lib/missingItems.ts, src/context/useReport.ts
// - Key Responsibilities: List unuploaded photo slots and blank form fields, format clipboard text, and provide quick visual feedback
// - Notes: Built following Scandinavian UI principles with minimal visual noise and high utility
// ---

import React, { useState } from 'react';
import { useReport } from '../../context/useReport';
import { getMissingReportItems } from '../../lib/missingItems';

interface MissingItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MissingItemsModal: React.FC<MissingItemsModalProps> = ({ isOpen, onClose }) => {
  const { state } = useReport();
  const [activeTab, setActiveTab] = useState<'photos' | 'data'>('photos');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const summary = getMissingReportItems(state);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary.formattedChatText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Group missing photos by section
  const photosBySection: Record<string, typeof summary.missingImages> = {};
  for (const img of summary.missingImages) {
    const sec = img.section || 'Dokumentasi Lainnya';
    if (!photosBySection[sec]) photosBySection[sec] = [];
    photosBySection[sec].push(img);
  }

  // Group missing data by category
  const dataByCategory: Record<string, typeof summary.missingData> = {};
  for (const item of summary.missingData) {
    if (!dataByCategory[item.category]) dataByCategory[item.category] = [];
    dataByCategory[item.category].push(item);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-left">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Daftar Belum Terisi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm sm:max-w-md">
              {state.location.lokasi || 'Nama Lokasi Belum Diisi'}
              {state.location.kapasitas ? ` • ${state.location.kapasitas}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
            title="Tutup"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Copy Action Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">Total Kekurangan:</span>
            <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-xs border border-amber-200">
              {summary.totalMissingImages} Foto
            </span>
            <span className="bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded text-xs">
              {summary.totalMissingData} Data
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Tersalin ke Clipboard!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span>Salin untuk Chat Grup</span>
              </>
            )}
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-white px-5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'photos'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Foto Belum Ada ({summary.totalMissingImages})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'data'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Data Belum Terisi ({summary.totalMissingData})
          </button>
        </div>

        {/* List Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs text-slate-700">
          {activeTab === 'photos' && (
            <>
              {summary.totalMissingImages === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold text-lg">
                    ✓
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">Semua Foto Sudah Terisi</p>
                  <p className="text-xs text-slate-500 mt-0.5">Tidak ada slot foto dokumentasi yang kosong.</p>
                </div>
              ) : (
                Object.entries(photosBySection).map(([secName, items]) => (
                  <div key={secName} className="space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                        {secName}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-400">
                        {items.length} foto
                      </span>
                    </div>
                    <ul className="space-y-1.5 pl-1">
                      {items.map((item, idx) => (
                        <li key={item.id} className="flex items-start gap-2 text-slate-600">
                          <span className="text-slate-400 font-mono text-[11px] shrink-0 mt-0.5">
                            {idx + 1}.
                          </span>
                          <span className="font-medium text-slate-800">{item.caption}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'data' && (
            <>
              {summary.totalMissingData === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold text-lg">
                    ✓
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">Semua Data Sudah Lengkap</p>
                  <p className="text-xs text-slate-500 mt-0.5">Seluruh formulir dan tabel pengukuran telah terisi.</p>
                </div>
              ) : (
                Object.entries(dataByCategory).map(([catName, items]) => (
                  <div key={catName} className="space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                        {catName}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-400">
                        {items.length} item
                      </span>
                    </div>
                    <ul className="space-y-1.5 pl-1">
                      {items.map((item, idx) => (
                        <li key={`${item.category}-${idx}`} className="flex items-start gap-2 text-slate-600">
                          <span className="text-slate-400 font-mono text-[11px] shrink-0 mt-0.5">
                            {idx + 1}.
                          </span>
                          <span className="font-medium text-slate-800">{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Dapat langsung ditempel di WhatsApp atau Telegram.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-3.5 py-1.5 rounded-lg transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

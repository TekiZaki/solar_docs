// ---
// Summary:
// - Purpose: Interactive export modal and progress reporter for DOCX generation
// - Role: Presentation dialog component
// - Depends on: src/context/ReportContext.tsx, src/lib/docxExport.ts
// - Key Responsibilities: Display document completeness statistics, trigger export, show compilation status, report errors
// - Notes: Informs user of "Empty" and "pl.jpg" fallbacks
// ---

import React, { useEffect, useState } from 'react';
import { useReport } from '../../context/useReport';
import { exportReportToDocx } from '../../lib/docxExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { state, setCustomFileName, currentReportId } = useReport();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const safeLocation = state.location.lokasi.trim() || 'LOKASI';
  const locationBasedDefault = `REPORT_MT_PLTS_JKT_${safeLocation.replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;
  // Export name tracks the report file id so no manual Reset Default is needed
  const defaultFileName = currentReportId ? `${currentReportId}.docx` : locationBasedDefault;
  const [fileName, setFileName] = useState(state.customFileName || defaultFileName);

  useEffect(() => {
    setFileName(state.customFileName || defaultFileName);
  }, [state.customFileName, defaultFileName]);

  if (!isOpen) return null;

  const totalSlots = Object.keys(state.photoSlots).length;
  const uploadedCount = Object.values(state.photoSlots).filter((s) => s.isUploaded).length;
  const emptySlotsCount = totalSlots - uploadedCount;

  const handleExport = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const finalName = fileName.trim() ? fileName.trim() : defaultFileName;
      await exportReportToDocx(state, finalName, (msg) => setStatusMessage(msg));
      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 800);
    } catch (err: unknown) {
      console.error('Export error:', err);
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan ekspor';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 text-left space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-900">Ekspor Laporan Pemeliharaan</h3>
              <p className="text-xs text-slate-500">Format Microsoft Word (.docx)</p>
            </div>
          </div>
          {!loading && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Stats & Filename Config */}
        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2.5">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold text-slate-800">Nama Berkas Unduhan (.docx):</span>
                <button
                  type="button"
                  onClick={() => {
                    setFileName(defaultFileName);
                    setCustomFileName(defaultFileName);
                  }}
                  className="text-[10px] text-slate-500 hover:text-slate-900 underline"
                  title="Kembalikan ke format default"
                >
                  Reset Default
                </button>
              </div>
              <input
                type="text"
                value={fileName}
                onChange={(e) => {
                  setFileName(e.target.value);
                  setCustomFileName(e.target.value);
                }}
                placeholder={defaultFileName}
                className="w-full text-xs font-mono px-2.5 py-1.5 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="flex justify-between text-slate-700 pt-1 border-t border-slate-200/60">
              <span>Status Foto:</span>
              <span className="font-medium text-slate-900">
                {uploadedCount} terisi, {emptySlotsCount} kosong
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ketentuan Ekspor Otomatis:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-700 ml-1">
              <li>{emptySlotsCount} foto yang belum diunggah otomatis digantikan dengan <code>pl.jpg</code>.</li>
              <li>Kolom checklist kondisi yang tidak diisi dibiarkan blank (kosong).</li>
              <li>Semua tata letak, kop surat dinas, dan nomor tabel tetap 100% presisi.</li>
            </ul>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          {loading && (
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Memproses dokumen...</span>
                <span>{statusMessage}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-slate-900 h-2 rounded-full animate-pulse w-full"></div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded border border-slate-200 hover:bg-slate-50 transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleExport}
            className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-medium px-5 py-2 rounded shadow-sm transition flex items-center gap-1.5"
          >
            {loading ? (
              <span>Mengompilasi...</span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Unduh DOCX Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

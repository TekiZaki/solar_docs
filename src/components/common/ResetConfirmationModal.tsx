// ---
// Summary:
// - Purpose: Confirmation dialog before executing destructive report reset
// - Role: Presentation dialog component
// - Depends on: React
// - Key Responsibilities: Enforce deliberate user confirmation before clearing document data
// - Notes: Minimal UI without emojis or decorative clutter
// ---

import React from 'react';

interface ResetConfirmationModalProps {
  isOpen: boolean;
  targetReportName: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResetConfirmationModal: React.FC<ResetConfirmationModalProps> = ({
  isOpen,
  targetReportName,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 text-left space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900">Konfirmasi Reset Laporan</h3>
            <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
          </div>
        </div>

        <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
          Anda akan mereset seluruh data pada berkas{' '}
          <strong className="text-slate-900 font-mono break-all">{targetReportName}</strong> kembali ke format template default.
          Semua foto, isian formulir, dan tabel pengukuran pada berkas tersebut akan dikembalikan ke kondisi awal.
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-50 rounded border border-slate-300 transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded transition shadow-sm border border-rose-700 flex items-center gap-1.5"
          >
            {isLoading ? 'Mereset...' : 'Ya, Reset Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
};
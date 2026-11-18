// ---
// Summary:
// - Purpose: Confirmation dialog before swapping selected Pre (II.II) and Post (II.IV) phase items
// - Role: Presentation dialog component
// - Depends on: React
// - Key Responsibilities: Confirm target report and exact selected counts before mutating disk files and JSON state
// ---

import React from 'react';

interface SwapConfirmationModalProps {
  isOpen: boolean;
  targetReportName: string;
  selectedPhotoPairCount: number;
  selectedCustomSlotCount: number;
  selectedMeasurementCount: number;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SwapConfirmationModal: React.FC<SwapConfirmationModalProps> = ({
  isOpen,
  targetReportName,
  selectedPhotoPairCount,
  selectedCustomSlotCount,
  selectedMeasurementCount,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const totalPhotoItems = selectedPhotoPairCount + selectedCustomSlotCount;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 text-left space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900">Konfirmasi Tukar Data Terpilih</h3>
            <p className="text-xs text-slate-500">Pengukuran Pra (II.II) dan Pasca (II.IV)</p>
          </div>
        </div>

        <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
          <p>
            Berkas target:{' '}
            <strong className="text-slate-900 font-mono break-all">{targetReportName}</strong>
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-700 tabular-nums">
            {totalPhotoItems > 0 && (
              <li>
                <strong>{selectedPhotoPairCount}</strong> pasangan PhotoCard pengukuran
                {selectedCustomSlotCount > 0 && (
                  <> + <strong>{selectedCustomSlotCount}</strong> kartu tambahan</>
                )}{' '}
                (foto, tanggal, dan deskripsi).
              </li>
            )}
            {selectedMeasurementCount > 0 && (
              <li>
                <strong>{selectedMeasurementCount}</strong> baris Tabel Hasil Pengukuran (Before &harr; After).
              </li>
            )}
          </ul>
          <p className="text-slate-500">
            Item yang tidak dicentang tetap dipertahankan seperti semula.
          </p>
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
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded transition shadow-sm border border-slate-900 flex items-center gap-1.5"
          >
            {isLoading ? 'Menukar...' : 'Ya, Tukar Item Terpilih'}
          </button>
        </div>
      </div>
    </div>
  );
};

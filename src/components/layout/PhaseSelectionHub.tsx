// ---
// Summary:
// - Purpose: Central phase selection hub for the maintenance workflow
// - Role: Workflow navigation hub
// - Depends on: src/context/useReport.ts
// - Key Responsibilities: Display high-level progress cards for the 4 core maintenance phases and provide direct navigation
// - Notes: Satisfies the stepped workflow requirement
// ---

import React from 'react';
import { useReport } from '../../context/useReport';

export type MaintenancePhaseKey =
  | 'physical'
  | 'pre_measure'
  | 'cleaning'
  | 'post_measure'
  | 'analysis'
  | 'damage_rec';

interface PhaseSelectionHubProps {
  onSelectPhase: (phase: MaintenancePhaseKey) => void;
  onEditGeneralInfo: () => void;
  onOpenExport: () => void;
  onOpenMissingItems: () => void;
}

export const PhaseSelectionHub: React.FC<PhaseSelectionHubProps> = ({
  onSelectPhase,
  onEditGeneralInfo,
  onOpenExport,
  onOpenMissingItems,
}) => {
  const { state, migrateImages } = useReport();
  const [isMigrating, setIsMigrating] = React.useState(false);
  const [migrateStatus, setMigrateStatus] = React.useState<{ text: string; error?: boolean } | null>(null);

  const getStats = (phaseKey: string) => {
    const slots = Object.values(state.photoSlots).filter((s) => s.phaseKey === phaseKey);
    const uploaded = slots.filter((s) => s.isUploaded).length;
    return { uploaded, total: slots.length };
  };

  const p1 = getStats('physical');
  const p2 = getStats('pre_measure');
  const p3 = getStats('cleaning');
  const p4 = getStats('post_measure');

  const totalUploaded = Object.values(state.photoSlots).filter((s) => s.isUploaded).length;
  const totalSlots = Object.keys(state.photoSlots).length;
  const missingCount = totalSlots - totalUploaded;
  const base64SlotsCount = Object.values(state.photoSlots).filter(
    (s) => s.isUploaded && !s.imagePath && s.imageDataUrl
  ).length;

  const handleMigrate = async () => {
    setIsMigrating(true);
    setMigrateStatus(null);
    try {
      const res = await migrateImages();
      if (res.success) {
        setMigrateStatus({
          text: `Berhasil mengonversi ${res.convertedCount} foto menjadi berkas fisik di server. Ukuran berkas kini lebih ringan.`,
        });
      } else {
        setMigrateStatus({ text: 'Gagal melakukan konversi foto.', error: true });
      }
    } catch {
      setMigrateStatus({ text: 'Terjadi kesalahan jaringan saat konversi.', error: true });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6 text-left w-full mx-auto">
      {/* Site Identity Card */}
      <div className="bg-white border border-black rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Lokasi Pemeliharaan Terpilih
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
            {state.location.lokasi || 'Nama Lokasi Belum Diisi'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
            {state.location.alamat || 'Alamat belum diisi'} • Kapasitas: {state.location.kapasitas}
          </p>
        </div>
        <button
          type="button"
          onClick={onEditGeneralInfo}
          className="border border-black text-xs font-semibold text-black hover:text-black bg-slate-100 hover:bg-gray-400 px-3.5 py-2 rounded-lg transition whitespace-nowrap self-start sm:self-center"
        >
          Ubah Informasi Umum & Lokasi
        </button>
      </div>

      {/* Missing Items Banner */}
      <div className="bg-amber-50/70 border border-black rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
              Status Kelengkapan Laporan
            </h4>
          </div>
          <p className="text-xs text-amber-800/80 mt-1">
            {missingCount > 0
              ? `${missingCount} foto dokumentasi belum terisi. Periksa dan salin daftar untuk dikirim ke grup tim.`
              : 'Semua foto dokumentasi telah terisi lengkap.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenMissingItems}
          className="text-xs font-semibold text-amber-900 bg-white hover:bg-amber-100/60 border border-amber-300 px-3.5 py-2 rounded-lg transition whitespace-nowrap self-start sm:self-center shadow-sm flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Daftar Belum Terisi & Salin</span>
        </button>
      </div>

      {/* Base64 Migration Banner */}
      {(base64SlotsCount > 0 || migrateStatus) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Optimasi Berkas Foto
              </h4>
            </div>
            {migrateStatus ? (
              <p className={`text-xs ${migrateStatus.error ? 'text-rose-600' : 'text-slate-600'}`}>
                {migrateStatus.text}
              </p>
            ) : (
              <p className="text-xs text-slate-600">
                Terdapat {base64SlotsCount} foto tersimpan dalam format Base64. Konversi ke berkas fisik di server untuk meringankan beban transfer jaringan.
              </p>
            )}
          </div>
          {base64SlotsCount > 0 && (
            <button
              type="button"
              disabled={isMigrating}
              onClick={handleMigrate}
              className="text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 disabled:opacity-50 px-3.5 py-2 rounded-lg transition whitespace-nowrap self-start sm:self-center shadow-sm"
            >
              {isMigrating ? 'Mengonversi Foto...' : 'Konversi Base64 ke Berkas'}
            </button>
          )}
        </div>
      )}

      {/* Title */}
      <div>
        <h3 className="text-base font-bold text-slate-900">
          Pilih Tahap Pemeliharaan (Phase)
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Pilih salah satu tahap di bawah. Data dan foto dari tahap lain akan disembunyikan agar Anda fokus pada pekerjaan saat ini.
        </p>
      </div>

      {/* 4 Core Maintenance Phase Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Phase 1 */}
        <div
          onClick={() => onSelectPhase('physical')}
          className="bg-white border-2 border-black hover:border-slate-900 rounded-xl p-5 hover:bg-gray-300 transition cursor-pointer flex flex-col justify-between gap-4 group"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                TAHAP II.I
              </span>
              <span className="text-xs font-mono font-medium text-slate-500">
                {p1.uploaded}/{p1.total} Foto
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-slate-800">
              PENGECEKAN KONDISI INSTALASI
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Inspeksi visual komponen utama saat tiba (Inverter, DC Box, AC Box, Smart TV, Panel Atap) & pengisian checklist fisik 45 item.
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-black text-xs font-semibold text-slate-900 group-hover:translate-x-0.5 transition-transform">
            <span>Buka Pengecekan Fisik</span>
            <span>&rarr;</span>
          </div>
        </div>

        {/* Phase 2 */}
        <div
          onClick={() => onSelectPhase('pre_measure')}
          className="bg-white border-2 border-black hover:border-slate-900 rounded-xl p-5 hover:bg-gray-300 transition cursor-pointer flex flex-col justify-between gap-4 group"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                TAHAP II.II
              </span>
              <span className="text-xs font-mono font-medium text-slate-500">
                {p2.uploaded}/{p2.total} Foto
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-slate-800">
              PENGUKURAN PRA PEMBERSIHAN
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pengukuran parameter elektrik DC (Vmp/Imp), tegangan 3-fasa AC, arus fasa, resistansi grounding pra-cuci, dan foto alat ukur.
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-black text-xs font-semibold text-slate-900 group-hover:translate-x-0.5 transition-transform">
            <span>Buka Pengukuran Pra</span>
            <span>&rarr;</span>
          </div>
        </div>

        {/* Phase 3 */}
        <div
          onClick={() => onSelectPhase('cleaning')}
          className="bg-white border-2 border-black hover:border-slate-900 rounded-xl p-5 hover:bg-gray-300 transition cursor-pointer flex flex-col justify-between gap-4 group"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                TAHAP II.III
              </span>
              <span className="text-xs font-mono font-medium text-slate-500">
                {p3.uploaded}/{p3.total} Foto
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-slate-800">
              PEMBERSIHAN
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Foto kondisi panel sebelum dibersihkan, pengecekan thermal imager & IR thermometer, proses pencucian modul, dan pengecekan pasca cuci.
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-black text-xs font-semibold text-slate-900 group-hover:translate-x-0.5 transition-transform">
            <span>Buka Pembersihan PV</span>
            <span>&rarr;</span>
          </div>
        </div>

        {/* Phase 4 */}
        <div
          onClick={() => onSelectPhase('post_measure')}
          className="bg-white border-2 border-black hover:border-slate-900 rounded-xl p-5 hover:bg-gray-300 transition cursor-pointer flex flex-col justify-between gap-4 group"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                TAHAP II.IV
              </span>
              <span className="text-xs font-mono font-medium text-slate-500">
                {p4.uploaded}/{p4.total} Foto
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-slate-800">
              PENGUKURAN PASCA PEMBERSIHAN
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pengujian performa elektrik pasca-cuci, verifikasi kenaikan arus Vmp/Imp, pengukuran AC & grounding pasca pemeliharaan.
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-black text-xs font-semibold text-slate-900 group-hover:translate-x-0.5 transition-transform">
            <span>Buka Pengukuran Pasca</span>
            <span>&rarr;</span>
          </div>
        </div>
      </div>

      {/* Secondary Steps: Analysis, Damage/Recommendations, and DOCX Export */}
      <div className="bg-blue-200 rounded-xl p-4 border border-black space-y-3">
        <span className="text-[11px] font-semibold text-black uppercase tracking-wider block">
          Analisis Akhir & Pelaporan
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onSelectPhase('analysis')}
            className="p-3 bg-white hover:bg-gray-300 border border-black rounded-lg text-left transition flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-bold text-black">III. Analisa Performa & STC</div>
              <div className="text-[11px] text-slate-500">Tabel komparasi & deviasi otomatis</div>
            </div>
            <span className="text-slate-400 font-bold">&rarr;</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectPhase('damage_rec')}
            className="p-3 bg-white hover:bg-gray-300 border border-black rounded-lg text-left transition flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-bold text-black">IV. Kesimpulan & Rekomendasi</div>
              <div className="text-[11px] text-slate-500">Kesimpulan, rekomendasi & inventarisasi kerusakan</div>
            </div>
            <span className="text-slate-400 font-bold">&rarr;</span>
          </button>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
          <span className="text-xs text-black">
            Total Dokumentasi: <strong>{totalUploaded}</strong> dari {totalSlots} foto terunggah.
          </span>
          <button
            type="button"
            onClick={onOpenExport}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Ekspor Laporan (DOCX)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

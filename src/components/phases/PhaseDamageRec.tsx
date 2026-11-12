// ---
// Summary:
// - Purpose: Form view for Conclusion, Technical Recommendations, and Damage Inventory (Section IV)
// - Role: Phase presentation component
// - Depends on: src/context/useReport.ts, src/lib/pvAnalysis.ts
// - Key Responsibilities: Provide editable executive conclusion with auto-sync from field analysis, technical recommendations table (10 items), and damage inventory table with auto-pull from NOK checklist items
// ---

import React, { useMemo } from 'react';
import { useReport } from '../../context/useReport';
import { computePVAnalysis } from '../../lib/pvAnalysis';

export const PhaseDamageRec: React.FC = () => {
  const {
    state,
    addDamage,
    updateDamage,
    deleteDamage,
    setDamages,
    addTechnicalRecommendation,
    updateTechnicalRecommendation,
    deleteTechnicalRecommendation,
    setTechnicalRecommendations,
    updateConclusions,
  } = useReport();

  const analysis = useMemo(() => computePVAnalysis(state), [state]);

  const currentTechnicalRecs = state.technicalRecommendations ?? [];

  const currentConclusionText =
    state.conclusions.pvModuleSummary &&
    !state.conclusions.pvModuleSummary.startsWith('PV Module di [LOKASI_CAPS]')
      ? state.conclusions.pvModuleSummary
      : analysis.executiveConclusion;

  const handleSyncConclusion = () => {
    updateConclusions({ pvModuleSummary: analysis.executiveConclusion });
  };

  const handleSyncRecommendations = () => {
    setTechnicalRecommendations(analysis.technicalRecommendations);
  };

  const handleSyncDamages = () => {
    setDamages(analysis.detectedDamages);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="border-b border-black pb-3">
        <div className="inline-block text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200 mb-1">
          Bagian IV
        </div>
        <h2 className="text-xl font-semibold text-slate-900">
          IV. KESIMPULAN & REKOMENDASI
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Kesimpulan evaluasi operasional sistem, rekomendasi teknis tindak lanjut, serta inventarisasi kerusakan di lapangan.
        </p>
      </div>

      {/* 1. KESIMPULAN */}
      <div className="bg-white border border-black rounded-lg p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              1. KESIMPULAN
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sintesis evaluasi kondisi operasional sistem, keseragaman Voc/Vmp, dan string catatan monitoring.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSyncConclusion}
            className="self-start sm:self-auto bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-2.5 py-1.5 rounded border border-slate-300 font-medium transition flex items-center gap-1.5"
            title="Generate kesimpulan otomatis dari data pengukuran lapangan"
          >
            <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Tarik Otomatis dari Analisa
          </button>
        </div>
        <textarea
          rows={6}
          value={currentConclusionText}
          onChange={(e) => updateConclusions({ pvModuleSummary: e.target.value })}
          className="w-full text-xs font-sans px-3 py-2.5 rounded border border-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 leading-relaxed"
        />
      </div>

      {/* 2. REKOMENDASI */}
      <div className="bg-white border border-black rounded-lg p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              2. REKOMENDASI
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekomendasi teknis tindak lanjut pemeliharaan berdasarkan temuan parameter string dan kondisi lapangan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncRecommendations}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-2.5 py-1.5 rounded border border-slate-300 font-medium transition flex items-center gap-1.5"
              title="Generate 10 rekomendasi standar sesuai temuan pengukuran"
            >
              <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Tarik 10 Rekomendasi Otomatis
            </button>
            <button
              type="button"
              onClick={addTechnicalRecommendation}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-3 py-1.5 rounded font-medium shadow-sm transition flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Baris
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-blue-100 text-slate-700 border-b border-black font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-12">NO.</th>
                <th className="py-2.5 px-3 w-72">PARAMETER / TEMUAN</th>
                <th className="py-2.5 px-3">REKOMENDASI TEKNIS</th>
                <th className="py-2.5 px-3 w-14 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentTechnicalRecs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                    Belum ada rekomendasi teknis. Klik &quot;Tambah Baris&quot; atau &quot;Tarik 10 Rekomendasi Otomatis&quot;.
                  </td>
                </tr>
              ) : (
                currentTechnicalRecs.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-mono text-slate-500 align-top pt-3">{rec.no || idx + 1}</td>
                    <td className="py-1.5 px-3 align-top">
                      <textarea
                        rows={2}
                        value={rec.parameterTemuan}
                        onChange={(e) =>
                          updateTechnicalRecommendation(rec.id, { parameterTemuan: e.target.value })
                        }
                        placeholder="Parameter / temuan..."
                        className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 resize-y leading-relaxed min-h-[44px]"
                      />
                    </td>
                    <td className="py-1.5 px-3 align-top">
                      <textarea
                        rows={2}
                        value={rec.rekomendasiTeknis}
                        onChange={(e) =>
                          updateTechnicalRecommendation(rec.id, { rekomendasiTeknis: e.target.value })
                        }
                        placeholder="Uraian rekomendasi teknis..."
                        className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 resize-y leading-relaxed min-h-[44px]"
                      />
                    </td>
                    <td className="py-1.5 px-3 text-center align-top pt-3">
                      <button
                        type="button"
                        onClick={() => deleteTechnicalRecommendation(rec.id)}
                        className="text-slate-400 hover:text-rose-600 transition"
                        title="Hapus baris"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. INVENTARISASI KERUSAKAN */}
      <div className="bg-white border border-black rounded-lg p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              3. INVENTARISASI KERUSAKAN
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Catatan kerusakan komponen saat inspeksi lapangan. Format tabel sesuai dokumen resmi terkini.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncDamages}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-2.5 py-1.5 rounded border border-slate-300 font-medium transition flex items-center gap-1.5"
              title="Tarik otomatis komponen yang bertanda NOK dari Bagian II.I Checklist"
            >
              <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Tarik dari Item NOK (II.I)
            </button>
            <button
              type="button"
              onClick={addDamage}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-3 py-1.5 rounded font-medium shadow-sm transition flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Baris
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-blue-100 text-slate-700 border-b border-black font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-12">NO</th>
                <th className="py-2.5 px-3 w-44">LOKASI</th>
                <th className="py-2.5 px-3">KERUSAKAN DI LOKASI</th>
                <th className="py-2.5 px-3">UPDATE KERUSAKAN</th>
                <th className="py-2.5 px-3">REKOMENDASI</th>
                <th className="py-2.5 px-3 w-14 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.damages.map((dmg) => (
                <tr key={dmg.id} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 font-mono text-slate-500 align-top pt-3">{dmg.no}</td>
                  <td className="py-1.5 px-3 align-top min-w-[140px]">
                    <textarea
                      rows={2}
                      value={dmg.lokasi || state.location.lokasi}
                      onChange={(e) => updateDamage(dmg.id, { lokasi: e.target.value })}
                      placeholder="Nama lokasi..."
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 resize-y leading-relaxed min-h-[44px]"
                    />
                  </td>
                  <td className="py-1.5 px-3 align-top min-w-[160px]">
                    <textarea
                      rows={2}
                      value={dmg.kerusakanDiLokasi}
                      onChange={(e) => updateDamage(dmg.id, { kerusakanDiLokasi: e.target.value })}
                      placeholder="Contoh: Tidak Ada"
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 resize-y leading-relaxed min-h-[44px]"
                    />
                  </td>
                  <td className="py-1.5 px-3 align-top min-w-[160px]">
                    <textarea
                      rows={2}
                      value={dmg.updateKerusakan}
                      onChange={(e) => updateDamage(dmg.id, { updateKerusakan: e.target.value })}
                      placeholder="Contoh: Tidak Ada"
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 resize-y leading-relaxed min-h-[44px]"
                    />
                  </td>
                  <td className="py-1.5 px-3 align-top min-w-[180px]">
                    <textarea
                      rows={2}
                      value={dmg.rekomendasi ?? ''}
                      onChange={(e) => updateDamage(dmg.id, { rekomendasi: e.target.value })}
                      placeholder="Rekomendasi perbaikan..."
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 resize-y leading-relaxed min-h-[44px]"
                    />
                  </td>
                  <td className="py-1.5 px-3 text-center align-top pt-3">
                    {state.damages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteDamage(dmg.id)}
                        className="text-slate-400 hover:text-rose-600 transition"
                        title="Hapus baris"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

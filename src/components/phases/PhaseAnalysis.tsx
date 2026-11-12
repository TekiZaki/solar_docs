// ---
// Summary:
// - Purpose: Form and auto-calculation view for Section III Performance Analysis and STC calculations
// - Role: Phase presentation component
// - Depends on: src/context/useReport.ts, src/constants/defaultData.ts, src/lib/pvAnalysis.ts, src/lib/calculations.ts
// - Key Responsibilities: Display Before-After comparison table, PV datasheet inputs, STC theoretical calculation table, field measurement analysis (Voc, Vmp, Irradiance), Vmp/Voc ratios, and 6-point conclusion summary
// ---

import React, { useMemo } from 'react';
import { useReport } from '../../context/useReport';
import {
  EXAMPLE_MEASUREMENTS,
  AC_STANDARD_VALUES,
  EXAMPLE_DATASHEET,
  EXAMPLE_STC_STRINGS,
} from '../../constants/defaultData';
import { computePVAnalysis } from '../../lib/pvAnalysis';
import { formatIndoNumber } from '../../lib/calculations';

export const PhaseAnalysis: React.FC = () => {
  const {
    state,
    updateMeasurement,
    updateDatasheet,
    updateSTCRow,
    setHidePVAnalisis,
  } = useReport();

  const dcItems = state.measurements.filter((m) => m.id.startsWith('dc_'));
  const displayedDcItems = state.hidePVAnalisis
    ? dcItems.filter((m) => !m.id.startsWith('dc_voc_'))
    : dcItems;
  const acItems = state.measurements.filter((m) => m.id.startsWith('ac_') || m.id.startsWith('ground_'));

  const analysis = useMemo(() => computePVAnalysis(state), [state]);

  const handleAutoFillSTC = () => {
    state.stcStrings.forEach((str, sIdx) => {
      const vocMeas = state.measurements.find((m) => m.id === `dc_voc_${sIdx * 2 + 1}`)?.hasilAfter || '';
      const vmpMeas = state.measurements.find((m) => m.id === `dc_vmp_${sIdx + 1}`)?.hasilAfter || '';
      const impMeas = state.measurements.find((m) => m.id === `dc_imp_${sIdx + 1}`)?.hasilAfter || '';

      updateSTCRow(sIdx, 0, {
        stc: str.rows[0].stc || formatIndoNumber(analysis.vocSTC, 0),
        meas: str.rows[0].meas || vocMeas,
      });
      updateSTCRow(sIdx, 1, {
        stc: str.rows[1].stc || formatIndoNumber(analysis.vmpSTC, 0),
        meas: str.rows[1].meas || vmpMeas,
      });
      updateSTCRow(sIdx, 2, {
        stc: str.rows[2].stc || (analysis.iscSTC ? formatIndoNumber(analysis.iscSTC, 1) : ''),
      });
      updateSTCRow(sIdx, 3, {
        stc: str.rows[3].stc || (analysis.impSTC ? formatIndoNumber(analysis.impSTC, 1) : ''),
        meas: str.rows[3].meas || impMeas,
      });
    });
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="border-b border-black pb-3">
        <div className="inline-block text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200 mb-1">
          Bagian III
        </div>
        <h2 className="text-xl font-semibold text-slate-900">
          III. ANALISA PERFORMA & PERHITUNGAN TEORITIS (STC)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Komparasi Before-After otomatis, data sheet PV module, perhitungan STC teoritis, dan analisa data lapangan.
        </p>
      </div>

      {/* III.I. Tabel Komparasi Before - After */}
      <div className="bg-white border border-black rounded-lg p-4 sm:p-5 space-y-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            III.I. Tabel Komparasi Pengukuran [Before - After]
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Nilai otomatis diambil dari data pengukuran Pra (Before) dan Pasca (After). Angka dalam kurung abu-abu merupakan contoh referensi.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DC Comparison */}
          <div className="border border-black rounded-lg overflow-hidden">
            <div className="bg-blue-100 px-3 py-2 font-semibold text-xs text-slate-800 border-b border-black flex items-center justify-between gap-2">
              <span>
                {state.hidePVAnalisis
                  ? '1. PANEL DC COMBINER BOX (Vmp & Imp)'
                  : '1. PANEL DC COMBINER BOX (Vmp, Imp & Voc)'}
              </span>
              <button
                type="button"
                onClick={() => setHidePVAnalisis(!state.hidePVAnalisis)}
                className={`text-[11px] font-medium px-2 py-0.5 rounded border transition-colors ${
                  state.hidePVAnalisis
                    ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {state.hidePVAnalisis
                  ? 'Tampilkan Data PV Analisis'
                  : 'Sembunyikan Data PV Analisis ?'}
              </button>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-black">
                <tr>
                  <th className="py-2 px-3 w-16">NO</th>
                  <th className="py-2 px-3">PARAMETER</th>
                  <th className="py-2 px-3 w-24">BEFORE</th>
                  <th className="py-2 px-3 w-24">AFTER</th>
                  <th className="py-2 px-3 w-24">STANDARD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedDcItems.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-mono text-slate-500">{m.no}</td>
                    <td className="py-2 px-3 text-slate-800">{m.parameter}</td>
                    <td className="py-2 px-3 font-mono font-medium text-slate-700 bg-slate-50/50">
                      {m.hasilBefore || (
                        <span className="text-slate-400 italic">
                          ({EXAMPLE_MEASUREMENTS[m.id]?.before || '-'})
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-emerald-700 bg-emerald-50/30">
                      {m.hasilAfter || (
                        <span className="text-slate-400 font-normal italic">
                          ({EXAMPLE_MEASUREMENTS[m.id]?.after || '-'})
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-slate-500 bg-slate-50/30">
                      <input
                        type="text"
                        value={m.standard ?? ''}
                        onChange={(e) => updateMeasurement(m.id, { standard: e.target.value })}
                        placeholder="Std"
                        className="w-full text-xs font-mono px-2 py-1 rounded border border-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AC & Grounding Comparison */}
          <div className="border border-black rounded-lg overflow-hidden">
            <div className="bg-blue-100 px-3 py-2 font-semibold text-xs text-slate-800 border-b border-black">
              2. PANEL AC COMBINER BOX & GROUNDING
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-black">
                <tr>
                  <th className="py-2 px-3 w-16">NO</th>
                  <th className="py-2 px-3">PARAMETER</th>
                  <th className="py-2 px-3 w-24">BEFORE</th>
                  <th className="py-2 px-3 w-24">AFTER</th>
                  <th className="py-2 px-3 w-24">STANDARD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {acItems.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-mono text-slate-500">{m.no}</td>
                    <td className="py-2 px-3 text-slate-800">{m.parameter}</td>
                    <td className="py-2 px-3 font-mono font-medium text-slate-700 bg-slate-50/50">
                      {m.hasilBefore || (
                        <span className="text-slate-400 italic">
                          ({EXAMPLE_MEASUREMENTS[m.id]?.before || '-'})
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-emerald-700 bg-emerald-50/30">
                      {m.hasilAfter || (
                        <span className="text-slate-400 font-normal italic">
                          ({EXAMPLE_MEASUREMENTS[m.id]?.after || '-'})
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-500 bg-slate-50/30">
                      {AC_STANDARD_VALUES[m.id] ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* III.II.I. Tegangan Daya Maksimum (Vmp) - Tabel Parameter STC Per-String */}
      <div className="bg-white border border-black rounded-lg p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              III.II.I. TEGANGAN DAYA MAKSIMUM (Vmp) & HASIL ANALISA STRING
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tabel analisa parameter Voc, Vmp, Isc, dan Imp per-string (kondisi nominal, STC, dan hasil pengukuran lapangan). Persentase hasil analisa dihitung otomatis: ((STC − MEAS) / STC) × 100%.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAutoFillSTC}
            className="self-start sm:self-auto text-xs font-medium px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded border border-purple-300 transition-colors shrink-0"
          >
            Tarik Nilai STC & Pengukuran (MEAS)
          </button>
        </div>

        <div className="space-y-4">
          {state.stcStrings.map((stringData, sIdx) => {
            const exampleString = EXAMPLE_STC_STRINGS[sIdx];
            return (
              <div key={stringData.stringName} className="border border-black rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 font-bold text-xs text-slate-800 flex items-center justify-between border-b border-slate-200">
                  <span>{stringData.stringName}</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {state.location.lokasi.trim() || 'LOKASI PLTS'}
                  </span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-black">
                    <tr>
                      <th className="py-2 px-3 w-28">PARAMETER</th>
                      <th className="py-2 px-3">NOM</th>
                      <th className="py-2 px-3">STC</th>
                      <th className="py-2 px-3">MEAS</th>
                      <th className="py-2 px-3 w-36 bg-purple-50/50 text-purple-900">
                        HASIL ANALISA (AUTO)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stringData.rows.map((row, rIdx) => {
                      const exRow = exampleString?.rows[rIdx];
                      return (
                        <tr key={row.parameter} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-700">
                            {row.parameter}
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={row.nom}
                              onChange={(e) => updateSTCRow(sIdx, rIdx, { nom: e.target.value })}
                              placeholder={exRow?.nom || ''}
                              className="w-full text-xs font-mono px-2 py-1 rounded border border-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={row.stc}
                              onChange={(e) => updateSTCRow(sIdx, rIdx, { stc: e.target.value })}
                              placeholder={exRow?.stc || ''}
                              className="w-full text-xs font-mono px-2 py-1 rounded border border-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={row.meas}
                              onChange={(e) => updateSTCRow(sIdx, rIdx, { meas: e.target.value })}
                              placeholder={exRow?.meas || ''}
                              className="w-full text-xs font-mono px-2 py-1 rounded border border-gray-400 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-purple-900 bg-purple-50/30">
                            {row.hasilAnalisa || (
                              <span className="text-slate-400 font-normal italic">
                                ({exRow?.hasilAnalisa || '-'})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      {/* III.II.II. Data Sheet PV Module */}
      <div className="bg-white border border-black rounded-lg p-4 sm:p-5 space-y-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            III.II.II. Data Sheet PV Module
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Nama parameter terkunci. Nilai spesifikasi dapat disesuaikan dengan datasheet modul yang terpasang di lokasi.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nominal Power + 5%
            </label>
            <input
              type="text"
              value={state.datasheet.nominalPower}
              onChange={(e) => updateDatasheet({ nominalPower: e.target.value })}
              placeholder={EXAMPLE_DATASHEET.nominalPower}
              className="w-full text-xs font-mono px-3 py-2 rounded border border-gray-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Rated Voltage (Vmp)
            </label>
            <input
              type="text"
              value={state.datasheet.ratedVoltageVmp}
              onChange={(e) => updateDatasheet({ ratedVoltageVmp: e.target.value })}
              placeholder={EXAMPLE_DATASHEET.ratedVoltageVmp}
              className="w-full text-xs font-mono px-3 py-2 rounded border border-gray-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Open Circuit Voltage (Voc) + 5%
            </label>
            <input
              type="text"
              value={state.datasheet.openCircuitVoltageVoc}
              onChange={(e) => updateDatasheet({ openCircuitVoltageVoc: e.target.value })}
              placeholder={EXAMPLE_DATASHEET.openCircuitVoltageVoc}
              className="w-full text-xs font-mono px-3 py-2 rounded border border-gray-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Rated Current (Imp)
            </label>
            <input
              type="text"
              value={state.datasheet.ratedCurrentImp}
              onChange={(e) => updateDatasheet({ ratedCurrentImp: e.target.value })}
              placeholder={EXAMPLE_DATASHEET.ratedCurrentImp}
              className="w-full text-xs font-mono px-3 py-2 rounded border border-gray-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Short Circuit Current (Isc) + 5%
            </label>
            <input
              type="text"
              value={state.datasheet.shortCircuitCurrentIsc}
              onChange={(e) => updateDatasheet({ shortCircuitCurrentIsc: e.target.value })}
              placeholder={EXAMPLE_DATASHEET.shortCircuitCurrentIsc}
              className="w-full text-xs font-mono px-3 py-2 rounded border border-gray-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Maximum System Voltage
            </label>
            <input
              type="text"
              value={state.datasheet.maximumSystemVoltage}
              onChange={(e) => updateDatasheet({ maximumSystemVoltage: e.target.value })}
              placeholder={EXAMPLE_DATASHEET.maximumSystemVoltage}
              className="w-full text-xs font-mono px-3 py-2 rounded border border-gray-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200">
          <div className="max-w-xs">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Jumlah Modul Seri per String
            </label>
            <input
              type="text"
              value={state.datasheet.numberOfModules}
              onChange={(e) => updateDatasheet({ numberOfModules: e.target.value })}
              placeholder={String(analysis.modulesPerString)}
              className="w-full text-xs font-mono px-3 py-2 rounded border border-gray-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>
      </div>

      {/* III.II.III. Perhitungan Nilai Teoritis STC */}
      <div className="bg-white border border-black rounded-lg p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              III.II.III. PERHITUNGAN NILAI TEORITIS (STANDARD TEST CONDITIONS – STC)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Nilai otomatis dikalkulasi berdasarkan data modul ({analysis.brand} {analysis.nominalPowerWp} Wp) dan konfigurasi {analysis.modulesPerString} modul seri.
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
            AUTO-CALCULATED
          </span>
        </div>

        {/* Narrative STC Box */}
        <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1">
          <p>
            Berdasarkan data teknis PV Module <strong>{analysis.brand} {analysis.nominalPowerWp} Wp</strong>, setiap modul memiliki nilai Vmp sebesar <strong>{formatIndoNumber(analysis.ratedVoltageVmp, 1)} V</strong> dan Voc sebesar <strong>{formatIndoNumber(analysis.openCircuitVoltageVoc, 1)} V</strong>. Sistem PLTS <strong>{state.location.lokasi.trim() || 'Lokasi'}</strong> terdiri dari <strong>{analysis.totalModules} modul</strong> yang terbagi menjadi <strong>{analysis.stringCount} string</strong>, sehingga secara konfigurasi masing-masing string terdiri dari <strong>{analysis.modulesPerString} modul</strong> yang terhubung secara seri.
          </p>
          <p className="text-slate-500 italic">
            Pada konfigurasi seri, tegangan setiap modul akan dijumlahkan, sedangkan arus string secara teoritis tetap sama dengan arus satu modul.
          </p>
        </div>

        {/* STC Calculation Table */}
        <div className="border border-black rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-blue-100 text-slate-800 font-semibold border-b border-black">
              <tr>
                <th className="py-2.5 px-3">PARAMETER</th>
                <th className="py-2.5 px-3">PERHITUNGAN</th>
                <th className="py-2.5 px-3">NILAI TEORITIS STC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2 px-3 font-medium text-slate-700">Jumlah modul/string</td>
                <td className="py-2 px-3 font-mono text-slate-400">—</td>
                <td className="py-2 px-3 font-mono font-semibold text-slate-800">{analysis.modulesPerString} modul</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-slate-700">Kapasitas/string</td>
                <td className="py-2 px-3 font-mono text-slate-600">{analysis.modulesPerString} × {analysis.nominalPowerWp} Wp</td>
                <td className="py-2 px-3 font-mono font-semibold text-slate-800">{analysis.kapasitasPerString.toLocaleString('id-ID')} Wp</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-slate-700">Voc/string</td>
                <td className="py-2 px-3 font-mono text-slate-600">{analysis.modulesPerString} × {formatIndoNumber(analysis.openCircuitVoltageVoc, 1)} V</td>
                <td className="py-2 px-3 font-mono font-semibold text-blue-700 bg-blue-50/30">{formatIndoNumber(analysis.vocSTC, 0)} Vdc</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-slate-700">Vmp/string</td>
                <td className="py-2 px-3 font-mono text-slate-600">{analysis.modulesPerString} × {formatIndoNumber(analysis.ratedVoltageVmp, 1)} V</td>
                <td className="py-2 px-3 font-mono font-semibold text-blue-700 bg-blue-50/30">{formatIndoNumber(analysis.vmpSTC, 0)} Vdc</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-slate-700">Imp/string</td>
                <td className="py-2 px-3 font-mono text-slate-400">—</td>
                <td className="py-2 px-3 font-mono font-semibold text-slate-800">{formatIndoNumber(analysis.impSTC, 2)} Adc</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-slate-700">Isc/string</td>
                <td className="py-2 px-3 font-mono text-slate-400">—</td>
                <td className="py-2 px-3 font-mono font-semibold text-slate-800">{formatIndoNumber(analysis.iscSTC, 2)} Adc</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* III.II.IV. Analisa Data Lapangan (Voc dan Vmp) */}
      <div className="bg-white border border-black rounded-lg p-4 sm:p-5 space-y-5 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            III.II.IV. ANALISA DATA LAPANGAN (Voc DAN Vmp)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Komparasi data pengukuran aktual pasca pembersihan terhadap nilai referensi STC.
          </p>
        </div>

        {/* Table 58: String Field Measurements vs STC */}
        <div className="border border-black rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-blue-100 text-slate-800 font-semibold border-b border-black">
              <tr>
                <th className="py-2.5 px-3">STRING</th>
                <th className="py-2.5 px-3">VOC AKTUAL</th>
                <th className="py-2.5 px-3">IRRADIANCE</th>
                <th className="py-2.5 px-3">VMP AKTUAL</th>
                <th className="py-2.5 px-3">DEVIASI VMP THD STC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analysis.strings.map((s) => (
                <tr key={s.name} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 font-semibold text-slate-800">{s.name}</td>
                  <td className="py-2 px-3 font-mono font-medium text-slate-700">{s.voc} V</td>
                  <td className="py-2 px-3 font-mono text-slate-600">{s.irr} W/m²</td>
                  <td className="py-2 px-3 font-mono font-semibold text-slate-800">{s.vmp} V</td>
                  <td className="py-2 px-3 font-mono font-bold text-rose-700 bg-rose-50/30">
                    {s.deviasiVmp < 0 ? '−' : ''}{formatIndoNumber(Math.abs(s.deviasiVmp), 2)}%
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold border-t border-slate-300">
                <td className="py-2 px-3 text-purple-900">STC</td>
                <td className="py-2 px-3 font-mono text-purple-900">{formatIndoNumber(analysis.vocSTC, 0)} V</td>
                <td className="py-2 px-3 font-mono text-purple-900">1.000 W/m²</td>
                <td className="py-2 px-3 font-mono text-purple-900">{formatIndoNumber(analysis.vmpSTC, 0)} V</td>
                <td className="py-2 px-3 font-mono text-slate-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detailed Breakdown: Voc & Vmp */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Tegangan Sirkuit Terbuka (Voc) */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-300 space-y-3 text-xs text-slate-700">
            <h4 className="font-semibold text-sm text-slate-900 border-b border-slate-200 pb-1.5">
              1. Tegangan Sirkuit Terbuka (Voc)
            </h4>
            <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200">
              Voc(STC) = {analysis.modulesPerString} × {formatIndoNumber(analysis.openCircuitVoltageVoc, 1)} V = {formatIndoNumber(analysis.vocSTC, 0)} Vdc
            </div>
            <div className="space-y-1">
              {analysis.strings.map((s) => (
                <div key={s.name} className="flex justify-between items-center py-0.5 border-b border-slate-100">
                  <span className="font-medium text-slate-800">{s.name}:</span>
                  <span className="font-mono">
                    {s.voc} V <span className="text-slate-400">({s.deviasiVoc < 0 ? '−' : ''}{formatIndoNumber(Math.abs(s.deviasiVoc), 2)}% STC)</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 text-slate-600 leading-relaxed border-t border-slate-200">
              <span className="font-semibold text-slate-800">Rentang Voc:</span> {analysis.minVoc}–{analysis.maxVoc} Vdc ({formatIndoNumber(analysis.minVocPct, 1)}%–{formatIndoNumber(analysis.maxVocPct, 1)}% STC).
              <br />
              <span className="font-semibold text-slate-800">Keseragaman:</span> Selisih maksimum Voc hanya {analysis.deltaVoc} V pada selisih radiasi {analysis.deltaIrr} W/m², menunjukkan tidak ada rangkaian modul yang terputus / open circuit.
            </div>
          </div>

          {/* 2. Tegangan Daya Maksimum (Vmp) */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-300 space-y-3 text-xs text-slate-700">
            <h4 className="font-semibold text-sm text-slate-900 border-b border-slate-200 pb-1.5">
              2. Tegangan Daya Maksimum (Vmp)
            </h4>
            <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200">
              Vmp(STC) = {analysis.modulesPerString} × {formatIndoNumber(analysis.ratedVoltageVmp, 1)} V = {formatIndoNumber(analysis.vmpSTC, 0)} Vdc
            </div>
            <div className="space-y-1">
              {analysis.strings.map((s) => (
                <div key={s.name} className="flex justify-between items-center py-0.5 border-b border-slate-100">
                  <span className="font-medium text-slate-800">{s.name}:</span>
                  <span className="font-mono">
                    {s.vmp} V <span className="text-slate-400">({s.deviasiVmp < 0 ? '−' : ''}{formatIndoNumber(Math.abs(s.deviasiVmp), 2)}% STC)</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 text-slate-600 leading-relaxed border-t border-slate-200">
              <span className="font-semibold text-slate-800">Rentang Vmp:</span> {analysis.minVmp}–{analysis.maxVmp} Vdc.
              <br />
              <span className="font-semibold text-slate-800">Fokus Monitoring:</span> {analysis.outlierString.name} memiliki Vmp ({analysis.outlierString.vmp} V) yang lebih rendah dibandingkan string lainnya, sehingga direkomendasikan untuk pemantauan berkala.
            </div>
          </div>
        </div>

        {/* Table 59: Vmp to Voc Ratio */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-900">
            Tabel Rasio Vmp / Voc
          </h4>
          <div className="border border-black rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-black">
                <tr>
                  <th className="py-2 px-3">STRING</th>
                  <th className="py-2 px-3">VOC</th>
                  <th className="py-2 px-3">VMP</th>
                  <th className="py-2 px-3">RASIO VMP / VOC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analysis.strings.map((s) => (
                  <tr key={s.name} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-medium text-slate-800">{s.name}</td>
                    <td className="py-2 px-3 font-mono text-slate-700">{s.voc} V</td>
                    <td className="py-2 px-3 font-mono text-slate-700">{s.vmp} V</td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-700 bg-blue-50/20">
                      {formatIndoNumber(s.rasioVmpVoc, 2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Kesimpulan Performa PV Module (6 Poin) */}
        <div className="p-4 bg-purple-50/40 rounded-lg border border-purple-200 space-y-2.5 text-xs text-slate-800">
          <h4 className="font-semibold text-sm text-purple-900">
            3. Kesimpulan Performa PV Module
          </h4>
          <ul className="space-y-1.5 list-disc list-inside text-slate-700 leading-relaxed">
            <li>
              <strong>a. Kondisi Voc antar-string sangat seragam:</strong> Selisih maksimum hanya {analysis.deltaVoc} V menunjukkan kontinuitas rangkaian seri konsisten.
            </li>
            <li>
              <strong>b. Tidak terdapat indikasi kehilangan modul seri:</strong> Tidak ditemukan drop tegangan sebesar 1 modul ({formatIndoNumber(analysis.openCircuitVoltageVoc, 1)} V).
            </li>
            <li>
              <strong>c. String berimbang:</strong> {analysis.balancedStrings.map((s) => s.name).join(' dan ')} menunjukkan karakteristik tegangan kerja yang seimbang.
            </li>
            <li>
              <strong>d. String {analysis.outlierString.name} menunjukkan Vmp relatif lebih rendah:</strong> Perlu perhatian lebih lanjut untuk trending dan pengecekan koneksi/shading.
            </li>
            <li>
              <strong>e. Nilai irradiance sebagai interpretasi hasil:</strong> Radiasi aktual ({analysis.minIrr}–{analysis.maxIrr} W/m²) jauh di bawah STC 1.000 W/m² sehingga penurunan tegangan dan arus wajar.
            </li>
            <li>
              <strong>f. Hasil Imp seimbang:</strong> Nilai arus string relatif berimbang dan tidak menunjukkan deviasi arus yang ekstrem.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

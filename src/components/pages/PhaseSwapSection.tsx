// ---
// Summary:
// - Purpose: Selective checklist UI for swapping PhotoCards and grouped measurement rows between Pra (II.II) and Pasca (II.IV)
// - Role: Feature presentation component
// - Depends on: src/types/schema.ts, src/lib/phaseSwap.ts
// - Key Responsibilities: Render paired PhotoCards (including matched custom slots) and grouped DC/AC measurement checklists matching MeasurementTable sections
// ---

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ElectricalMeasurement, MaintenanceReportState, PhotoSlot } from '../../types/schema';
import { getPrePostSwapPreviewData, isPhotoSlotFilled } from '../../lib/phaseSwap';

interface PhaseSwapSectionProps {
  targetState: MaintenanceReportState | null;
  isLoadingState: boolean;
  isSwapping: boolean;
  selectedPhotoPairIds: string[];
  selectedCustomSlotIds: string[];
  selectedMeasurementIds: string[];
  onChangePhotoPairIds: (ids: string[]) => void;
  onChangeCustomSlotIds: (ids: string[]) => void;
  onChangeMeasurementIds: (ids: string[]) => void;
  onClearAllSelections: () => void;
  onRequestSwap: () => void;
}

type SwapTab = 'photos' | 'measurements';

function resolveSlotThumbSrc(slot: PhotoSlot): string {
  if (slot.imageDataUrl) return slot.imageDataUrl;
  if (slot.imagePath) {
    return `${import.meta.env.BASE_URL}${slot.imagePath}${slot.updatedAt ? `?v=${slot.updatedAt}` : ''}`;
  }
  return '';
}

const GroupCheckbox: React.FC<{
  itemIds: string[];
  selectedSet: Set<string>;
  onToggleGroup: (ids: string[], selectAll: boolean) => void;
  title?: string;
}> = ({ itemIds, selectedSet, onToggleGroup, title }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedCount = itemIds.filter((id) => selectedSet.has(id)).length;
  const allChecked = itemIds.length > 0 && selectedCount === itemIds.length;
  const someChecked = selectedCount > 0 && selectedCount < itemIds.length;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = someChecked;
    }
  }, [someChecked]);

  return (
    <input
      ref={inputRef}
      type="checkbox"
      disabled={itemIds.length === 0}
      checked={allChecked}
      onChange={() => onToggleGroup(itemIds, !allChecked)}
      onClick={(e) => e.stopPropagation()}
      title={title}
      className="w-4 h-4 rounded border-slate-400 text-slate-900 focus:ring-slate-900 disabled:opacity-40 cursor-pointer"
    />
  );
};

const SlotPreviewCell: React.FC<{ slot: PhotoSlot; phaseBadge: string }> = ({ slot, phaseBadge }) => {
  const filled = isPhotoSlotFilled(slot);
  const src = filled ? resolveSlotThumbSrc(slot) : '';

  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <div className="w-9 h-12 rounded border border-slate-200 bg-slate-50 shrink-0 overflow-hidden flex items-center justify-center">
        {src ? (
          <img
            src={src}
            alt={slot.caption}
            loading="lazy"
            className={`w-full h-full ${slot.isFitted ? 'object-contain bg-white' : 'object-cover'}`}
          />
        ) : (
          <span className="text-[9px] text-slate-400 font-medium">Kosong</span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-slate-500">{phaseBadge}</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded border ${
              filled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            {filled ? 'Terisi' : 'Kosong'}
          </span>
        </div>
        <p className="text-xs text-slate-900 font-medium leading-snug line-clamp-2 break-words">
          {slot.caption || slot.defaultCaption}
        </p>
        <p className="text-[11px] text-slate-500 truncate">{slot.date || '-'}</p>
      </div>
    </div>
  );
};

const MeasurementRowList: React.FC<{
  rows: ElectricalMeasurement[];
  selectedSet: Set<string>;
  onToggleRow: (id: string) => void;
}> = ({ rows, selectedSet, onToggleRow }) => (
  <>
    {rows.map((m) => {
      const checked = selectedSet.has(m.id);
      return (
        <tr
          key={m.id}
          onClick={() => onToggleRow(m.id)}
          className={`cursor-pointer transition ${
            checked ? 'bg-slate-100/90' : 'hover:bg-slate-50'
          }`}
        >
          <td className="py-2 px-2.5 w-9" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggleRow(m.id)}
              className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
            />
          </td>
          <td className="py-2 px-2 font-mono tabular-nums text-slate-600 w-14">{m.no}</td>
          <td className="py-2 px-2 text-slate-900 font-medium">
            {m.parameter || <span className="text-slate-400">(tanpa nama)</span>}
          </td>
          <td className="py-2 px-2 font-mono tabular-nums text-slate-700 w-24">
            {m.hasilBefore.trim() || <span className="text-slate-400">-</span>}
          </td>
          <td className="py-2 px-1 text-center text-slate-400 w-5">&harr;</td>
          <td className="py-2 px-2 font-mono tabular-nums text-slate-700 w-24">
            {m.hasilAfter.trim() || <span className="text-slate-400">-</span>}
          </td>
        </tr>
      );
    })}
  </>
);

export const PhaseSwapSection: React.FC<PhaseSwapSectionProps> = ({
  targetState,
  isLoadingState,
  isSwapping,
  selectedPhotoPairIds,
  selectedCustomSlotIds,
  selectedMeasurementIds,
  onChangePhotoPairIds,
  onChangeCustomSlotIds,
  onChangeMeasurementIds,
  onClearAllSelections,
  onRequestSwap,
}) => {
  const [activeTab, setActiveTab] = useState<SwapTab>('photos');
  const [photoQuery, setPhotoQuery] = useState('');
  const [measQuery, setMeasQuery] = useState('');

  const preview = useMemo(
    () => (targetState ? getPrePostSwapPreviewData(targetState) : null),
    [targetState]
  );

  const selectedPhotoSet = useMemo(() => new Set(selectedPhotoPairIds), [selectedPhotoPairIds]);
  const selectedCustomSet = useMemo(() => new Set(selectedCustomSlotIds), [selectedCustomSlotIds]);
  const selectedMeasSet = useMemo(() => new Set(selectedMeasurementIds), [selectedMeasurementIds]);

  const filteredPhotoPairs = useMemo(() => {
    if (!preview) return [];
    const q = photoQuery.trim().toLowerCase();
    if (!q) return preview.photoPairs;
    return preview.photoPairs.filter(
      (p) =>
        p.preSlot.caption.toLowerCase().includes(q) ||
        p.postSlot.caption.toLowerCase().includes(q) ||
        p.preSlot.defaultCaption.toLowerCase().includes(q) ||
        p.preId.toLowerCase().includes(q) ||
        p.postId.toLowerCase().includes(q)
    );
  }, [preview, photoQuery]);

  const filteredUnpairedCustoms = useMemo(() => {
    if (!preview) return [];
    const q = photoQuery.trim().toLowerCase();
    if (!q) return preview.unpairedCustomSlots;
    return preview.unpairedCustomSlots.filter(
      (c) =>
        c.slot.caption.toLowerCase().includes(q) ||
        c.slot.defaultCaption.toLowerCase().includes(q) ||
        c.directionLabel.toLowerCase().includes(q)
    );
  }, [preview, photoQuery]);

  const filteredGroups = useMemo(() => {
    if (!preview) return null;
    const q = measQuery.trim().toLowerCase();
    const filterList = (list: ElectricalMeasurement[]) => {
      if (!q) return list;
      return list.filter(
        (m) =>
          m.no.toLowerCase().includes(q) ||
          m.parameter.toLowerCase().includes(q) ||
          m.hasilBefore.toLowerCase().includes(q) ||
          m.hasilAfter.toLowerCase().includes(q)
      );
    };
    const vmp = filterList(preview.measurementGroups.vmp);
    const imp = filterList(preview.measurementGroups.imp);
    const voc = filterList(preview.measurementGroups.voc);
    const otherDc = filterList(preview.measurementGroups.otherDc);
    const acAndGround = filterList(preview.measurementGroups.acAndGround);
    return {
      vmp,
      imp,
      voc,
      otherDc,
      acAndGround,
      dcAll: [...vmp, ...imp, ...voc, ...otherDc],
    };
  }, [preview, measQuery]);

  const togglePhotoPair = (preId: string) => {
    if (selectedPhotoSet.has(preId)) {
      onChangePhotoPairIds(selectedPhotoPairIds.filter((id) => id !== preId));
    } else {
      onChangePhotoPairIds([...selectedPhotoPairIds, preId]);
    }
  };

  const toggleCustomSlot = (slotId: string) => {
    if (selectedCustomSet.has(slotId)) {
      onChangeCustomSlotIds(selectedCustomSlotIds.filter((id) => id !== slotId));
    } else {
      onChangeCustomSlotIds([...selectedCustomSlotIds, slotId]);
    }
  };

  const toggleMeasurement = (id: string) => {
    if (selectedMeasSet.has(id)) {
      onChangeMeasurementIds(selectedMeasurementIds.filter((mId) => mId !== id));
    } else {
      onChangeMeasurementIds([...selectedMeasurementIds, id]);
    }
  };

  const toggleMeasurementGroup = (ids: string[], selectAll: boolean) => {
    const next = new Set(selectedMeasurementIds);
    for (const id of ids) {
      if (selectAll) next.add(id);
      else next.delete(id);
    }
    onChangeMeasurementIds(Array.from(next));
  };

  const handleSelectFilledPhotos = () => {
    if (!preview) return;
    onChangePhotoPairIds(preview.photoPairs.filter((p) => p.hasAnyPhoto).map((p) => p.preId));
    onChangeCustomSlotIds(
      preview.unpairedCustomSlots.filter((c) => c.hasPhoto).map((c) => c.slot.id)
    );
  };

  const handleSelectAllVisiblePhotos = () => {
    const nextPairIds = new Set(selectedPhotoPairIds);
    for (const p of filteredPhotoPairs) nextPairIds.add(p.preId);
    onChangePhotoPairIds(Array.from(nextPairIds));

    const nextCustomIds = new Set(selectedCustomSlotIds);
    for (const c of filteredUnpairedCustoms) nextCustomIds.add(c.slot.id);
    onChangeCustomSlotIds(Array.from(nextCustomIds));
  };

  const handleClearPhotos = () => {
    onChangePhotoPairIds([]);
    onChangeCustomSlotIds([]);
  };

  const handleSelectFilledMeasurements = () => {
    if (!preview) return;
    onChangeMeasurementIds(
      preview.measurements
        .filter((m) => Boolean(m.hasilBefore.trim() || m.hasilAfter.trim()))
        .map((m) => m.id)
    );
  };

  const handleSelectAllVisibleMeasurements = () => {
    if (!filteredGroups) return;
    const nextIds = new Set(selectedMeasurementIds);
    for (const m of [...filteredGroups.dcAll, ...filteredGroups.acAndGround]) {
      nextIds.add(m.id);
    }
    onChangeMeasurementIds(Array.from(nextIds));
  };

  const totalSelectedPhotos = selectedPhotoPairIds.length + selectedCustomSlotIds.length;
  const totalSelectedAll = totalSelectedPhotos + selectedMeasurementIds.length;

  return (
    <div className="bg-white border border-black rounded-xl p-5 shadow-sm space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-900">
          Tukar Data Terpilih: Pengukuran Pra (II.II) dan Pasca (II.IV)
        </h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-3xl">
          Centang PhotoCard atau baris Tabel Hasil Pengukuran yang ingin ditukar antara{' '}
          <span className="font-mono text-slate-700">pengukuran_pra</span> dan{' '}
          <span className="font-mono text-slate-700">pengukuran_pasca</span>. Hanya item yang dicentang yang akan ditukar.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('photos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition inline-flex items-center gap-2 ${
            activeTab === 'photos'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <span>PhotoCard</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums ${
              activeTab === 'photos' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {totalSelectedPhotos} dipilih
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('measurements')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition inline-flex items-center gap-2 ${
            activeTab === 'measurements'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <span>Tabel Hasil Pengukuran</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums ${
              activeTab === 'measurements' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {selectedMeasurementIds.length} dipilih
          </span>
        </button>
      </div>

      {isLoadingState ? (
        <div className="py-10 text-center text-xs text-slate-500 border border-slate-200 rounded-lg bg-slate-50">
          Memuat daftar item berkas...
        </div>
      ) : !preview || !filteredGroups ? (
        <div className="py-10 text-center text-xs text-slate-500 border border-slate-200 rounded-lg bg-slate-50">
          Data berkas tidak dapat dimuat.
        </div>
      ) : activeTab === 'photos' ? (
        <div className="space-y-3">
          {/* Filter + Bulk Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <input
                type="text"
                value={photoQuery}
                onChange={(e) => setPhotoQuery(e.target.value)}
                placeholder="Cari keterangan PhotoCard..."
                className="w-full h-8 pl-8 pr-7 text-xs rounded border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
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
              {photoQuery && (
                <button
                  type="button"
                  onClick={() => setPhotoQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold px-1"
                  title="Hapus pencarian"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={handleSelectFilledPhotos}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition"
              >
                Pilih yang Terisi
              </button>
              <button
                type="button"
                onClick={handleSelectAllVisiblePhotos}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition"
              >
                Pilih Semua
              </button>
              <button
                type="button"
                onClick={handleClearPhotos}
                disabled={totalSelectedPhotos === 0}
                className="px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-600 font-medium transition"
              >
                Kosongkan
              </button>
            </div>
          </div>

          {/* Photo Pairs List */}
          <div className="max-h-[420px] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {filteredPhotoPairs.length === 0 && filteredUnpairedCustoms.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Tidak ada PhotoCard yang cocok dengan pencarian.
              </div>
            ) : (
              <>
                {filteredPhotoPairs.map((pair, idx) => {
                  const checked = selectedPhotoSet.has(pair.preId);
                  return (
                    <div
                      key={pair.preId}
                      onClick={() => togglePhotoPair(pair.preId)}
                      role="checkbox"
                      aria-checked={checked}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          togglePhotoPair(pair.preId);
                        }
                      }}
                      className={`p-3 cursor-pointer transition flex items-start gap-3 ${
                        checked ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePhotoPair(pair.preId)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 shrink-0 cursor-pointer"
                      />

                      <div className="mt-0.5 w-6 shrink-0 flex flex-col items-start gap-1">
                        <span className="text-[11px] font-mono tabular-nums text-slate-400">
                          {idx + 1}.
                        </span>
                      </div>

                      <div className="flex-1 space-y-1.5 min-w-0">
                        {pair.isCustomPair && (
                          <span className="inline-block text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                            Kartu Tambahan Berpasangan
                          </span>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2.5 md:gap-3 items-start min-w-0">
                          <SlotPreviewCell slot={pair.preSlot} phaseBadge="Pra (II.II)" />
                          <div className="hidden md:flex items-center justify-center pt-3 text-slate-400 text-xs font-semibold">
                            &harr;
                          </div>
                          <SlotPreviewCell slot={pair.postSlot} phaseBadge="Pasca (II.IV)" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredUnpairedCustoms.length > 0 && (
                  <>
                    <div className="px-3 py-2 bg-slate-50 text-[11px] font-semibold text-slate-700 border-t border-slate-200">
                      Kartu Foto Tambahan (Belum Berpasangan - {filteredUnpairedCustoms.length})
                      <span className="block font-normal text-slate-500 mt-0.5">
                        Kartu ini hanya ada di satu fase; mencentang akan memindahkan kartu ke fase tujuan.
                      </span>
                    </div>
                    {filteredUnpairedCustoms.map((item) => {
                      const checked = selectedCustomSet.has(item.slot.id);
                      return (
                        <div
                          key={item.slot.id}
                          onClick={() => toggleCustomSlot(item.slot.id)}
                          role="checkbox"
                          aria-checked={checked}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              toggleCustomSlot(item.slot.id);
                            }
                          }}
                          className={`p-3 cursor-pointer transition flex items-start gap-3 ${
                            checked ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCustomSlot(item.slot.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 shrink-0 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <SlotPreviewCell slot={item.slot} phaseBadge={item.directionLabel} />
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Filter + Bulk Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <input
                type="text"
                value={measQuery}
                onChange={(e) => setMeasQuery(e.target.value)}
                placeholder="Cari parameter atau nilai..."
                className="w-full h-8 pl-8 pr-7 text-xs rounded border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
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
              {measQuery && (
                <button
                  type="button"
                  onClick={() => setMeasQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold px-1"
                  title="Hapus pencarian"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={handleSelectFilledMeasurements}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition"
              >
                Pilih yang Terisi
              </button>
              <button
                type="button"
                onClick={handleSelectAllVisibleMeasurements}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition"
              >
                Pilih Semua
              </button>
              <button
                type="button"
                onClick={() => onChangeMeasurementIds([])}
                disabled={selectedMeasurementIds.length === 0}
                className="px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-600 font-medium transition"
              >
                Kosongkan
              </button>
            </div>
          </div>

          {/* Two-Panel Grouped Measurement Tables mirroring MeasurementTable */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* 1. PANEL DC COMBINER BOX */}
            <div className="border border-black rounded-lg overflow-hidden bg-white">
              <div className="bg-blue-100 px-3 py-2 font-semibold text-xs text-slate-900 border-b border-black flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <GroupCheckbox
                    itemIds={filteredGroups.dcAll.map((m) => m.id)}
                    selectedSet={selectedMeasSet}
                    onToggleGroup={toggleMeasurementGroup}
                    title="Pilih semua baris Panel DC Combiner Box"
                  />
                  <span>1. PANEL DC COMBINER BOX</span>
                </label>
                <span className="text-[11px] font-normal text-slate-700 tabular-nums">
                  {filteredGroups.dcAll.length} baris
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-black">
                    <tr>
                      <th className="py-2 px-2.5 w-9" />
                      <th className="py-2 px-2 w-14">NO</th>
                      <th className="py-2 px-2">PARAMETER</th>
                      <th className="py-2 px-2 w-24">PRA (BEFORE)</th>
                      <th className="py-2 px-1 w-5" />
                      <th className="py-2 px-2 w-24">PASCA (AFTER)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGroups.dcAll.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          Tidak ada baris DC yang cocok.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {filteredGroups.vmp.length > 0 && (
                          <>
                            <tr
                              onClick={() => {
                                const ids = filteredGroups.vmp.map((m) => m.id);
                                const allChecked = ids.every((id) => selectedMeasSet.has(id));
                                toggleMeasurementGroup(ids, !allChecked);
                              }}
                              className="bg-slate-100/80 font-semibold text-slate-800 cursor-pointer hover:bg-slate-200/70 transition"
                            >
                              <td className="py-2 px-2.5">
                                <GroupCheckbox
                                  itemIds={filteredGroups.vmp.map((m) => m.id)}
                                  selectedSet={selectedMeasSet}
                                  onToggleGroup={toggleMeasurementGroup}
                                  title="Pilih semua 1.1 Vmp"
                                />
                              </td>
                              <td className="py-2 px-2 font-mono">1.1</td>
                              <td className="py-2 px-2" colSpan={4}>
                                Tegangan daya Maksimum (Vmp)
                              </td>
                            </tr>
                            <MeasurementRowList
                              rows={filteredGroups.vmp}
                              selectedSet={selectedMeasSet}
                              onToggleRow={toggleMeasurement}
                            />
                          </>
                        )}

                        {filteredGroups.imp.length > 0 && (
                          <>
                            <tr
                              onClick={() => {
                                const ids = filteredGroups.imp.map((m) => m.id);
                                const allChecked = ids.every((id) => selectedMeasSet.has(id));
                                toggleMeasurementGroup(ids, !allChecked);
                              }}
                              className="bg-slate-100/80 font-semibold text-slate-800 cursor-pointer hover:bg-slate-200/70 transition"
                            >
                              <td className="py-2 px-2.5">
                                <GroupCheckbox
                                  itemIds={filteredGroups.imp.map((m) => m.id)}
                                  selectedSet={selectedMeasSet}
                                  onToggleGroup={toggleMeasurementGroup}
                                  title="Pilih semua 1.2 Imp"
                                />
                              </td>
                              <td className="py-2 px-2 font-mono">1.2</td>
                              <td className="py-2 px-2" colSpan={4}>
                                Arus Daya Maksimum (Imp)
                              </td>
                            </tr>
                            <MeasurementRowList
                              rows={filteredGroups.imp}
                              selectedSet={selectedMeasSet}
                              onToggleRow={toggleMeasurement}
                            />
                          </>
                        )}

                        {filteredGroups.voc.length > 0 && (
                          <>
                            <tr
                              onClick={() => {
                                const ids = filteredGroups.voc.map((m) => m.id);
                                const allChecked = ids.every((id) => selectedMeasSet.has(id));
                                toggleMeasurementGroup(ids, !allChecked);
                              }}
                              className="bg-slate-100/80 font-semibold text-slate-800 cursor-pointer hover:bg-slate-200/70 transition"
                            >
                              <td className="py-2 px-2.5">
                                <GroupCheckbox
                                  itemIds={filteredGroups.voc.map((m) => m.id)}
                                  selectedSet={selectedMeasSet}
                                  onToggleGroup={toggleMeasurementGroup}
                                  title="Pilih semua 1.3 Voc & Irradiance"
                                />
                              </td>
                              <td className="py-2 px-2 font-mono">1.3</td>
                              <td className="py-2 px-2" colSpan={4}>
                                Voc &amp; Irradiance String PV
                              </td>
                            </tr>
                            <MeasurementRowList
                              rows={filteredGroups.voc}
                              selectedSet={selectedMeasSet}
                              onToggleRow={toggleMeasurement}
                            />
                          </>
                        )}

                        {filteredGroups.otherDc.length > 0 && (
                          <>
                            <tr
                              onClick={() => {
                                const ids = filteredGroups.otherDc.map((m) => m.id);
                                const allChecked = ids.every((id) => selectedMeasSet.has(id));
                                toggleMeasurementGroup(ids, !allChecked);
                              }}
                              className="bg-slate-100/80 font-semibold text-slate-800 cursor-pointer hover:bg-slate-200/70 transition"
                            >
                              <td className="py-2 px-2.5">
                                <GroupCheckbox
                                  itemIds={filteredGroups.otherDc.map((m) => m.id)}
                                  selectedSet={selectedMeasSet}
                                  onToggleGroup={toggleMeasurementGroup}
                                  title="Pilih semua 1.4 Parameter DC Tambahan"
                                />
                              </td>
                              <td className="py-2 px-2 font-mono">1.4</td>
                              <td className="py-2 px-2" colSpan={4}>
                                Parameter DC Tambahan
                              </td>
                            </tr>
                            <MeasurementRowList
                              rows={filteredGroups.otherDc}
                              selectedSet={selectedMeasSet}
                              onToggleRow={toggleMeasurement}
                            />
                          </>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. PANEL AC COMBINER BOX & GROUNDING */}
            <div className="border border-black rounded-lg overflow-hidden bg-white">
              <div className="bg-blue-100 px-3 py-2 font-semibold text-xs text-slate-900 border-b border-black flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <GroupCheckbox
                    itemIds={filteredGroups.acAndGround.map((m) => m.id)}
                    selectedSet={selectedMeasSet}
                    onToggleGroup={toggleMeasurementGroup}
                    title="Pilih semua baris Panel AC Combiner Box & Grounding"
                  />
                  <span>2. PANEL AC COMBINER BOX &amp; GROUNDING</span>
                </label>
                <span className="text-[11px] font-normal text-slate-700 tabular-nums">
                  {filteredGroups.acAndGround.length} baris
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-black">
                    <tr>
                      <th className="py-2 px-2.5 w-9" />
                      <th className="py-2 px-2 w-14">NO</th>
                      <th className="py-2 px-2">PARAMETER</th>
                      <th className="py-2 px-2 w-24">PRA (BEFORE)</th>
                      <th className="py-2 px-1 w-5" />
                      <th className="py-2 px-2 w-24">PASCA (AFTER)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGroups.acAndGround.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          Tidak ada baris AC / Grounding yang cocok.
                        </td>
                      </tr>
                    ) : (
                      <MeasurementRowList
                        rows={filteredGroups.acAndGround}
                        selectedSet={selectedMeasSet}
                        onToggleRow={toggleMeasurement}
                      />
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
          <span>
            Terpilih: <strong className="text-slate-900">{totalSelectedPhotos}</strong> PhotoCard dan{' '}
            <strong className="text-slate-900">{selectedMeasurementIds.length}</strong> baris pengukuran
          </span>
          {totalSelectedAll > 0 && (
            <button
              type="button"
              onClick={onClearAllSelections}
              className="text-slate-500 hover:text-slate-900 underline font-medium"
            >
              Reset pilihan
            </button>
          )}
        </div>

        <button
          type="button"
          disabled={totalSelectedAll === 0 || isSwapping || isLoadingState}
          onClick={onRequestSwap}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-sm border border-slate-900 transition inline-flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
          <span>Tukar Item Terpilih</span>
        </button>
      </div>
    </div>
  );
};

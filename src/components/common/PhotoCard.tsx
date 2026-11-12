// ---
// Summary:
// - Purpose: Interactive 3:4 photo slot card with camera capture, gallery picker, clipboard paste upload, pan adjustment, fit-to-frame, and metadata editing
// - Role: Core presentation component
// - Depends on: src/types/schema.ts, src/context/useReport.ts, src/lib/dateUtils.ts, ./CameraModal.tsx, ./usePhotoGestures.ts
// - Key Responsibilities: Enforce 3:4 aspect ratio, live 3:4 camera capture, draggable pan adjustment, double-tap fit with white background
// - Notes: Operates fully client-side and maintains clean Scandinavian aesthetics
// ---

import React, { useRef, useState } from 'react';
import type { PhotoSlot } from '../../types/schema';
import { useReport } from '../../context/useReport';
import {
  formatDateToIndonesian,
  parseIndonesianToDate,
  getTodayIndonesianDate,
} from '../../lib/dateUtils';
import { CameraModal } from './CameraModal';
import { usePhotoFileDrop, usePhotoGestures } from './usePhotoGestures';
interface PhotoCardEmptyPlaceholderProps {
  onCamera: () => void;
  onGallery: () => void;
  onPaste: () => void;
  isPasting: boolean;
  pasteError: string;
}

const PhotoCardEmptyPlaceholder: React.FC<PhotoCardEmptyPlaceholderProps> = ({ onCamera, onGallery, onPaste, isPasting, pasteError }) => (
  <div className="flex flex-col items-center justify-center p-4 text-center">
    <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    <span className="text-xs text-slate-500 mb-2">Rasio Foto 3:4</span>
    <div className="flex items-center gap-2 mb-1.5">
      <button
        type="button"
        onClick={onCamera}
        className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-3 py-1.5 rounded font-medium shadow-sm transition flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        </svg>
        Kamera
      </button>
      <button
        type="button"
        onClick={onGallery}
        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs px-3 py-1.5 rounded font-medium shadow-sm transition"
      >
        Galeri
      </button>
      <button
        type="button"
        onClick={onPaste}
        disabled={isPasting}
        className="bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 border border-slate-300 text-xs px-3 py-1.5 rounded font-medium shadow-sm transition"
        title="Tempel gambar dari clipboard"
      >
        {isPasting ? 'Menempel...' : 'Tempel'}
      </button>
    </div>
    {pasteError && (
      <span className="text-[11px] text-rose-600 mb-1">{pasteError}</span>
    )}
    <span className="hidden sm:inline-block text-[11px] text-slate-400">
      atau seret & lepas berkas ke sini
    </span>
  </div>
);

interface PhotoCardMetaProps {
  slot: PhotoSlot;
  isoDate: string;
  hideDate: boolean;
  hideCaption: boolean;
  onSetToday: () => void;
  onDatePicked: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateSlot: (fields: Partial<PhotoSlot>) => void;
}

const PhotoCardMeta: React.FC<PhotoCardMetaProps> = ({
  slot,
  isoDate,
  hideDate,
  hideCaption,
  onSetToday,
  onDatePicked,
  onUpdateSlot,
}) => {
  if (hideDate && hideCaption) return null;
  return (
    <div className="space-y-2">
      {!hideDate && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-medium text-white">
              Hari, Tanggal
            </label>
            <button
              type="button"
              onClick={onSetToday}
              className="text-[10px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded transition font-medium"
              title="Isi otomatis dengan tanggal hari ini"
            >
              Hari Ini
            </button>
          </div>

          <div className="space-y-1.5">
            <input
              type="text"
              value={slot.date}
              onChange={(e) => onUpdateSlot({ date: e.target.value })}
              placeholder="Contoh: Sabtu, 05 September 2026"
              className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50"
            />
            <input
              type="date"
              value={isoDate}
              onChange={onDatePicked}
              className="w-full text-xs px-2 py-1 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-700"
              title="Pilih tanggal dari Kalender"
            />
          </div>
        </div>
      )}

      {!hideCaption && (
        <div>
          <label className="block text-[11px] font-medium text-white mb-0.5">
            Deskripsi / Caption
          </label>
          <textarea
            rows={2}
            value={slot.caption}
            onChange={(e) => onUpdateSlot({ caption: e.target.value })}
            placeholder="Keterangan foto..."
            className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 resize-none text-black"
          />
        </div>
      )}
    </div>
  );
};

interface PhotoCardHeaderProps {
  slot: PhotoSlot;
  indexNumber?: number;
  allowInsert: boolean;
  onMovePrev?: () => void;
  onMoveNext?: () => void;
  onAddSlot: () => void;
  onDeleteSlot: () => void;
}

const PhotoCardHeader: React.FC<PhotoCardHeaderProps> = ({
  slot,
  indexNumber,
  allowInsert,
  onMovePrev,
  onMoveNext,
  onAddSlot,
  onDeleteSlot,
}) => {
  const displayTarget = slot.isCustom
    ? 'Tambahan'
    : slot.mediaTarget.replace(/^media\//, '');

  return (
    <div className="flex items-center justify-between text-xs gap-1 w-full min-w-0">
      <div className="flex items-center gap-1.5 min-w-0 shrink">
        {indexNumber !== undefined && (
          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center justify-center shrink-0">
            {indexNumber}
          </span>
        )}
        <span
          className="text-white font-mono text-[10px] truncate max-w-[65px] sm:max-w-[85px]"
          title={slot.mediaTarget}
        >
          {displayTarget}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {slot.isCustom && (
          <div className="inline-flex items-center gap-0.5">
            <button
              type="button"
              onClick={onMovePrev}
              className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition"
              title="Geser posisi kartu ke kiri / atas"
            >
              &larr;
            </button>
            <button
              type="button"
              onClick={onMoveNext}
              className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition"
              title="Geser posisi kartu ke kanan / bawah"
            >
              &rarr;
            </button>
          </div>
        )}
        {allowInsert && slot.phaseKey !== 'general' && (
          <button
            type="button"
            onClick={onAddSlot}
            className="text-[10px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded transition flex items-center gap-0.5 border border-slate-200 shrink-0"
            title="Sisipkan kartu foto baru setelah foto ini"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Sisipkan</span>
          </button>
        )}
        {slot.isCustom && (
          <button
            type="button"
            onClick={onDeleteSlot}
            className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 transition shrink-0"
            title="Hapus foto tambahan"
          >
            Hapus
          </button>
        )}
        {slot.isUploaded ? (
          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1 shrink-0">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Terisi
          </span>
        ) : (
          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
            pl.jpg
          </span>
        )}
      </div>
    </div>
  );
};

interface PhotoCardProps {
  slot: PhotoSlot;
  indexNumber?: number;
  hideDate?: boolean;
  hideCaption?: boolean;
  allowInsert?: boolean;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  slot,
  indexNumber,
  hideDate = false,
  hideCaption = false,
  allowInsert = true,
}) => {
  const {
    setPhotoSlotImage,
    setPhotoSlotDataUrl,
    removePhotoSlotImage,
    updatePhotoSlot,
    deletePhotoSlot,
    addPhotoSlot,
    movePhotoSlot,
  } = useReport();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [pasteError, setPasteError] = useState('');

  const { isDraggingFile, dropHandlers } = usePhotoFileDrop(async (file) => {
    await setPhotoSlotImage(slot.id, file);
  });

  const {
    isDragging,
    currentPanX,
    currentPanY,
    effectiveImageUrl,
    toggleFitted,
    pointerHandlers,
  } = usePhotoGestures(
    slot,
    containerRef,
    setPhotoSlotDataUrl
  );

  const isoDate = parseIndonesianToDate(slot.date);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await setPhotoSlotImage(slot.id, file);
      e.target.value = '';
    }
  };

  const handlePasteImage = async () => {
    try {
      setPasteError('');
      if (!navigator.clipboard?.read) {
        setPasteError('Clipboard tidak didukung browser ini');
        return;
      }
      setIsPasting(true);
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'));
        if (type) {
          const blob = await item.getType(type);
          const ext = type.split('/')[1] || 'png';
          await setPhotoSlotImage(slot.id, new File([blob], `pasted.${ext}`, { type }));
          return;
        }
      }
      setPasteError('Tidak ada gambar di clipboard');
    } catch {
      setPasteError('Gagal membaca clipboard');
    } finally {
      setIsPasting(false);
    }
  };

  const handleDatePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      updatePhotoSlot(slot.id, { date: formatDateToIndonesian(val) });
    }
  };

  const handleSetToday = () => {
    updatePhotoSlot(slot.id, { date: getTodayIndonesianDate() });
  };

  const handleCameraCapture = (dataUrl: string, rawDataUrl?: string) => {
    setPhotoSlotDataUrl(slot.id, dataUrl, rawDataUrl || dataUrl, {
      isFitted: false,
      panX: 0,
      panY: 0,
    });
  };

  const objectPosX = ((1 - currentPanX) / 2) * 100;
  const objectPosY = ((1 - currentPanY) / 2) * 100;

  return (
    <div className="bg-gray-600 border border-slate-200 rounded-lg p-3 sm:p-3.5 shadow-sm hover:border-slate-300 transition flex flex-col justify-between gap-3 text-left w-full min-w-0 overflow-hidden">
      <PhotoCardHeader
        slot={slot}
        indexNumber={indexNumber}
        allowInsert={allowInsert}
        onMovePrev={() => movePhotoSlot(slot.id, 'prev')}
        onMoveNext={() => movePhotoSlot(slot.id, 'next')}
        onAddSlot={() => addPhotoSlot(slot.phaseKey, undefined, slot.id)}
        onDeleteSlot={() => {
          if (window.confirm('Hapus kartu foto tambahan ini?')) {
            deletePhotoSlot(slot.id);
          }
        }}
      />

      {/* Image Preview & Upload Controls (Locked 3:4 Aspect Ratio, bg-white) */}
      <div
        ref={containerRef}
        {...dropHandlers}
        {...pointerHandlers}
        className={`relative group rounded border overflow-hidden aspect-[3/4] bg-white flex items-center justify-center transition select-none touch-none ${
          isDraggingFile
            ? 'bg-slate-200 border-2 border-dashed border-slate-900 ring-2 ring-slate-900/10'
            : 'border-slate-200 hover:border-slate-300'
        } ${slot.isUploaded && !slot.isFitted ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        {/* File Drag and Drop Active Overlay */}
        {isDraggingFile && (
          <div className="absolute inset-0 z-30 bg-slate-900/80 text-white flex flex-col items-center justify-center p-3 text-center pointer-events-none transition">
            <svg className="w-8 h-8 mb-1.5 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <span className="text-xs font-semibold">Lepaskan Foto di Sini</span>
            <span className="text-[10px] text-slate-300 mt-0.5">JPG, PNG, atau WEBP</span>
          </div>
        )}

        {slot.isUploaded && (slot.imageDataUrl || slot.imagePath || effectiveImageUrl) ? (
          <>
            <img
              src={effectiveImageUrl || slot.imageDataUrl || `${import.meta.env.BASE_URL}${slot.imagePath}${slot.updatedAt ? `?v=${slot.updatedAt}` : ''}`}
              alt={slot.caption}
              draggable={false}
              loading="lazy"
              style={{
                objectPosition: slot.isFitted ? 'center' : `${objectPosX}% ${objectPosY}%`,
              }}
              className={`w-full h-full pointer-events-none select-none ${
                isDragging ? 'transition-none' : 'transition-[object-position] duration-150'
              } ${
                slot.isFitted ? 'object-contain bg-white' : 'object-cover'
              }`}
            />

            {/* Bottom helper badge */}
            <div className="absolute bottom-2 inset-x-2 flex justify-center pointer-events-none transition opacity-75 group-hover:opacity-100">
              <span className="text-[10px] font-medium bg-black/60 text-white px-2 py-0.5 rounded backdrop-blur-sm shadow-sm text-center">
                {slot.isFitted
                  ? 'Pas (Latar Putih) • Ketuk 2x untuk Penuh'
                  : 'Geser untuk Atur Posisi • Ketuk 2x untuk Pas'}
              </span>
            </div>

            {/* Hover Actions Bar */}
            <div
              className={`absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 p-2 z-20 pointer-events-none ${
                isDragging ? 'hidden' : ''
              }`}
            >
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFitted();
                }}
                className="pointer-events-auto bg-white/95 hover:bg-white text-slate-800 text-xs px-2.5 py-1.5 rounded font-medium shadow-sm transition"
              >
                {slot.isFitted ? 'Penuh' : 'Pas'}
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  galleryInputRef.current?.click();
                }}
                className="pointer-events-auto bg-white/95 hover:bg-white text-slate-800 text-xs px-2.5 py-1.5 rounded font-medium shadow-sm transition"
              >
                Ganti
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePasteImage();
                }}
                disabled={isPasting}
                className="pointer-events-auto bg-white/95 hover:bg-white disabled:bg-slate-200 text-slate-800 text-xs px-2.5 py-1.5 rounded font-medium shadow-sm transition"
                title="Tempel gambar dari clipboard"
              >
                {isPasting ? 'Menempel...' : 'Tempel'}
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  removePhotoSlotImage(slot.id);
                }}
                className="pointer-events-auto bg-rose-600 hover:bg-rose-700 text-white text-xs px-2.5 py-1.5 rounded font-medium shadow-sm transition"
              >
                Hapus
              </button>
            </div>
          </>
        ) : (
          <PhotoCardEmptyPlaceholder
            onCamera={() => setIsCameraOpen(true)}
            onGallery={() => galleryInputRef.current?.click()}
            onPaste={handlePasteImage}
            isPasting={isPasting}
            pasteError={pasteError}
          />
        )}

        {/* Hidden Fallback Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Live 3:4 Camera Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        onFallbackToFilePicker={() => cameraInputRef.current?.click()}
      />

      {/* Editable Fields: Tanggal & Keterangan */}
      <PhotoCardMeta
        slot={slot}
        isoDate={isoDate}
        hideDate={hideDate}
        hideCaption={hideCaption}
        onSetToday={handleSetToday}
        onDatePicked={handleDatePicked}
        onUpdateSlot={(fields) => updatePhotoSlot(slot.id, fields)}
      />
    </div>
  );
};

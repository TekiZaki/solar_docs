// ---
// Summary:
// - Purpose: Camera capture modal that locks view and snaps photos in exact 3:4 aspect ratio
// - Role: Interactive capture component
// - Depends on: src/lib/imageUtils.ts
// - Key Responsibilities: Live 3:4 viewfinder, shutter snapshot, front/rear camera toggle, review screen, and device fallback
// - Notes: Follows Scandinavian design principles with clean contrast and functional simplicity
// ---

import React, { useEffect, useRef, useState } from 'react';
import { captureFullVideoFrame, captureVideoFrameTo34 } from '../../lib/imageUtils';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string, rawDataUrl?: string) => void;
  onFallbackToFilePicker: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onFallbackToFilePicker,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [rawSnapshot, setRawSnapshot] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleClose = () => {
    stopStream();
    setCapturedPhoto(null);
    setErrorMsg(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const startCamera = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      stopStream();
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Kamera tidak didukung oleh browser Anda.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setIsLoading(false);
      } catch (err: unknown) {
        if (!isMounted) return;
        setIsLoading(false);
        const errMessage =
          err instanceof Error
            ? err.message
            : 'Gagal mengakses kamera. Pastikan izin kamera aktif.';
        setErrorMsg(errMessage);
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopStream();
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    try {
      const rawUrl = captureFullVideoFrame(videoRef.current);
      const dataUrl = captureVideoFrameTo34(videoRef.current);
      setRawSnapshot(rawUrl);
      setCapturedPhoto(dataUrl);
    } catch (e) {
      console.error('Error capturing snapshot:', e);
    }
  };

  const handleAcceptPhoto = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto, rawSnapshot || capturedPhoto);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setRawSnapshot(null);
  };

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 select-none">
      <div className="relative w-full max-w-sm flex flex-col items-center">
        {/* Top Header */}
        <div className="w-full flex items-center justify-between text-white pb-3">
          <div className="text-xs font-medium tracking-wide">
            {capturedPhoto ? 'Pratinjau Foto (3:4)' : 'Kamera Foto (3:4)'}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* 3:4 Viewport Frame */}
        <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-black border border-white/20 shadow-2xl flex items-center justify-center">
          {isLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 text-white text-xs gap-2">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Menyiapkan kamera...</span>
            </div>
          )}

          {errorMsg ? (
            <div className="p-6 text-center text-white">
              <svg className="w-10 h-10 mx-auto text-rose-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-rose-200 mb-4">{errorMsg}</p>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onFallbackToFilePicker();
                }}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold py-2.5 px-4 rounded-lg shadow transition"
              >
                Gunakan Kamera Perangkat
              </button>
            </div>
          ) : capturedPhoto ? (
            <img
              src={capturedPhoto}
              alt="Snapshot"
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* 3:4 Framing Grid Overlay */}
              <div className="absolute inset-0 pointer-events-none border border-white/30">
                <div className="absolute top-1/3 left-0 right-0 border-t border-white/15" />
                <div className="absolute top-2/3 left-0 right-0 border-t border-white/15" />
                <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/15" />
                <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/15" />
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div className="w-full pt-4 flex items-center justify-between px-2">
          {capturedPhoto ? (
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 bg-white/15 hover:bg-white/25 text-white text-xs font-medium py-3 rounded-lg transition"
              >
                Ulangi
              </button>
              <button
                type="button"
                onClick={handleAcceptPhoto}
                className="flex-1 bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold py-3 rounded-lg shadow transition"
              >
                Gunakan Foto
              </button>
            </div>
          ) : !errorMsg ? (
            <div className="w-full flex items-center justify-between">
              {/* Camera Switch */}
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition"
                title="Ganti Kamera Depan / Belakang"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={handleTakeSnapshot}
                className="w-16 h-16 rounded-full bg-white p-1 shadow-lg hover:scale-105 active:scale-95 transition"
                title="Ambil Foto"
              >
                <div className="w-full h-full rounded-full border-2 border-slate-900 bg-white" />
              </button>

              {/* Fallback to File Upload */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFallbackToFilePicker();
                }}
                className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition text-xs"
                title="Pilih dari Galeri atau Kamera Bawaan"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

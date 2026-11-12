// ---
// Summary:
// - Purpose: Custom hooks for photo card gestures (drag-pan, double-tap fit, and drag-and-drop file upload)
// - Role: Presentation interaction hook
// - Depends on: react, src/types/schema.ts, src/lib/imageUtils.ts
// - Key Responsibilities: Manage pointer capture, delta normalization, fit toggling, and file drop handling
// ---

import React, { useRef, useState, useCallback } from 'react';
import type { PhotoSlot } from '../../types/schema';
import { cropOrFitTo34 } from '../../lib/imageUtils';

export function usePhotoFileDrop(onFile: (file: File) => Promise<void> | void) {
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|gif)$/i.test(file.name))) {
      await onFile(file);
    }
  };

  return {
    isDraggingFile,
    dropHandlers: {
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}

export function getEffectiveImageUrl(slot: PhotoSlot): string | undefined {
  const version = slot.updatedAt ? `?v=${slot.updatedAt}` : '';
  if (slot.rawImageDataUrl) return slot.rawImageDataUrl;
  if (slot.rawImagePath) return `${import.meta.env.BASE_URL}${slot.rawImagePath}${version}`;
  if (slot.imageDataUrl) return slot.imageDataUrl;
  if (slot.imagePath) return `${import.meta.env.BASE_URL}${slot.imagePath}${version}`;
  return undefined;
}

export function usePhotoGestures(
  slot: PhotoSlot,
  containerRef: React.RefObject<HTMLDivElement | null>,
  setPhotoSlotDataUrl: (
    id: string,
    dataUrl: string,
    rawUrl?: string,
    meta?: { isFitted?: boolean; panX?: number; panY?: number }
  ) => void
) {
  const isPointerDownRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const startPointerRef = useRef({ x: 0, y: 0 });
  const [panDelta, setPanDelta] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);

  const effectiveImageUrl = getEffectiveImageUrl(slot);

  const currentPanX = Math.max(-1, Math.min(1, (slot.panX || 0) + panDelta.x));
  // Invert Y direction for intuitive dragging: pulling down moves the image down
  const currentPanY = Math.max(-1, Math.min(1, (slot.panY || 0) + panDelta.y));

  const toggleFitted = useCallback(async () => {
    const rawUrl = getEffectiveImageUrl(slot);
    if (!rawUrl) return;

    const nextFitted = !slot.isFitted;
    const nextPanX = nextFitted ? 0 : (slot.panX || 0);
    const nextPanY = nextFitted ? 0 : (slot.panY || 0);

    try {
      const rendered = await cropOrFitTo34(rawUrl, {
        isFitted: nextFitted,
        panX: nextPanX,
        panY: nextPanY,
      });
      setPhotoSlotDataUrl(slot.id, rendered, undefined, {
        isFitted: nextFitted,
        panX: nextPanX,
        panY: nextPanY,
      });
      setPanDelta({ x: 0, y: 0 });
    } catch (err) {
      console.error('Failed to toggle fitted mode:', err);
    }
  }, [slot, setPhotoSlotDataUrl]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!slot.isUploaded || !effectiveImageUrl) return;
    if ((e.target as HTMLElement).closest('button')) return;

    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      toggleFitted();
      return;
    }
    lastTapRef.current = now;

    if (slot.isFitted) return;

    isPointerDownRef.current = true;
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    setPanDelta({ x: 0, y: 0 });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored if capture not supported
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || slot.isFitted || !containerRef.current) return;

    const dx = e.clientX - startPointerRef.current.x;
    const dy = e.clientY - startPointerRef.current.y;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setIsDragging(true);
    }

    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // Moving right (dx > 0) shows more left side (panX increases toward 1)
    // Moving down (dy > 0) shows more top side (panY increases toward 1)
    const deltaNormX = dx / (rect.width * 0.5);
    const deltaNormY = dy / (rect.height * 0.5);

    setPanDelta({ x: deltaNormX, y: deltaNormY });
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    const wasDragging = isDragging;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture lost
    }

    if (wasDragging && !slot.isFitted) {
      const rawUrl = getEffectiveImageUrl(slot);
      if (rawUrl) {
        try {
          const dx = e.clientX - startPointerRef.current.x;
          const dy = e.clientY - startPointerRef.current.y;
          const rect = containerRef.current?.getBoundingClientRect();

          const normX = rect && rect.width ? dx / (rect.width * 0.5) : panDelta.x;
          const normY = rect && rect.height ? dy / (rect.height * 0.5) : panDelta.y;

          const finalPanX = Math.max(-1, Math.min(1, (slot.panX || 0) + normX));
          const finalPanY = Math.max(-1, Math.min(1, (slot.panY || 0) + normY));

          const rendered = await cropOrFitTo34(rawUrl, {
            isFitted: false,
            panX: finalPanX,
            panY: finalPanY,
          });

          setPhotoSlotDataUrl(slot.id, rendered, undefined, {
            isFitted: false,
            panX: finalPanX,
            panY: finalPanY,
          });
          setPanDelta({ x: 0, y: 0 });
        } catch (err) {
          console.error('Failed to commit pan adjustment:', err);
        }
      }
    } else {
      setPanDelta({ x: 0, y: 0 });
    }
  };

  return {
    isDragging,
    currentPanX,
    currentPanY,
    effectiveImageUrl,
    toggleFitted,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
      onDoubleClick: toggleFitted,
    },
  };
}

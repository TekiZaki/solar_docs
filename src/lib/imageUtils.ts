// ---
// Summary:
// - Purpose: Image processing utilities for 3:4 aspect ratio cropping, pan adjustments, video frame capture, and client-side downsampling
// - Role: Infrastructure helper module
// - Depends on: none
// - Key Responsibilities: Provide canvas-based 3:4 cropping, pan calculations, fit-to-frame with white background, and lightweight camera downsampling
// - Notes: Targets 900x1200 @ 0.80 JPEG to minimize mobile data and memory overhead while maintaining crisp Word document print clarity
// ---

export interface CropOptions {
  isFitted?: boolean; // If true, fit entire image inside 3:4 with white background
  panX?: number; // Pan offset (-1 to 1)
  panY?: number; // Pan offset (-1 to 1)
  targetWidth?: number; // Default 900
  targetHeight?: number; // Default 1200
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export async function cropOrFitTo34(
  imageSource: string | HTMLImageElement,
  options: CropOptions = {}
): Promise<string> {
  const {
    isFitted = false,
    panX = 0,
    panY = 0,
    targetWidth = 900,
    targetHeight = 1200,
  } = options;

  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2d context');

  // Fill canvas with pure white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;

  if (!imgW || !imgH) {
    return canvas.toDataURL('image/jpeg', 0.80);
  }

  if (isFitted) {
    // "Fitted in" mode: entire image fits inside 3:4, letterbox is white
    const scale = Math.min(targetWidth / imgW, targetHeight / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = (targetWidth - drawW) / 2;
    const drawY = (targetHeight - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    // "Fill / Cover" mode: image covers 3:4, offset by panX/panY (-1 to 1)
    const scale = Math.max(targetWidth / imgW, targetHeight / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const maxPanX = Math.max(0, (drawW - targetWidth) / 2);
    const maxPanY = Math.max(0, (drawH - targetHeight) / 2);

    const clampedPanX = Math.max(-1, Math.min(1, panX));
    const clampedPanY = Math.max(-1, Math.min(1, panY));

    const drawX = (targetWidth - drawW) / 2 + clampedPanX * maxPanX;
    const drawY = (targetHeight - drawH) / 2 + clampedPanY * maxPanY;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  return canvas.toDataURL('image/jpeg', 0.80);
}

export function captureFullVideoFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function captureVideoFrameTo34(
  video: HTMLVideoElement,
  targetWidth = 900,
  targetHeight = 1200
): string {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2d context');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const vW = video.videoWidth;
  const vH = video.videoHeight;
  if (!vW || !vH) {
    return canvas.toDataURL('image/jpeg', 0.82);
  }

  // Cover 3:4 viewport
  const scale = Math.max(targetWidth / vW, targetHeight / vH);
  const drawW = vW * scale;
  const drawH = vH * scale;
  const drawX = (targetWidth - drawW) / 2;
  const drawY = (targetHeight - drawH) / 2;

  ctx.drawImage(video, drawX, drawY, drawW, drawH);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

export async function downsampleRawImage(
  source: File | string,
  maxDimension = 1200
): Promise<string> {
  const rawUrl = typeof source === 'string' ? source : await readFileAsDataUrl(source);
  const img = await loadImage(rawUrl);

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  // Pass through only small JPEGs: other formats (SVG, PNG, WebP, BMP) must be
  // normalized, since raw bytes are stored as .jpg and non-JPEG bytes break
  // <img> rendering and canvas re-renders once data URLs are stripped on save
  const isJpeg = rawUrl.startsWith('data:image/jpeg');
  if (w && h && w <= maxDimension && h <= maxDimension && isJpeg) {
    return rawUrl;
  }
  if (!w || !h) {
    return rawUrl;
  }

  const scale = Math.min(maxDimension / w, maxDimension / h);
  const targetW = Math.round(w * scale);
  const targetH = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return rawUrl;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas.toDataURL('image/jpeg', 0.82);
}

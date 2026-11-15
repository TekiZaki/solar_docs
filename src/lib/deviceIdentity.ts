// ---
// Summary:
// - Purpose: Browser device identification and editable technician device label persisted in localStorage
// - Role: Client-side identity helper
// - Depends on: browser localStorage, navigator.userAgent
// - Key Responsibilities: Generate stable deviceId per browser profile, infer OS/browser default name, allow custom rename
// ---

const DEVICE_ID_KEY = 'solar_docs_device_id';
const DEVICE_NAME_KEY = 'solar_docs_device_name';

function generateShortId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function detectDefaultDeviceName(deviceId: string): string {
  if (typeof navigator === 'undefined') {
    return `Perangkat (${deviceId.slice(0, 4)})`;
  }
  const ua = navigator.userAgent || '';
  let os = 'Perangkat';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'Mac';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Brave/i.test(ua)) browser = 'Brave';
  else if (/Chrome|CriOS/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';

  return `${os} ${browser} (${deviceId.slice(0, 4)})`;
}

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.trim()) return existing.trim();
    const created = generateShortId();
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return generateShortId();
  }
}

export function getDeviceName(deviceId: string): string {
  try {
    const saved = localStorage.getItem(DEVICE_NAME_KEY);
    if (saved && saved.trim()) return saved.trim();
    const fallback = detectDefaultDeviceName(deviceId);
    localStorage.setItem(DEVICE_NAME_KEY, fallback);
    return fallback;
  } catch {
    return detectDefaultDeviceName(deviceId);
  }
}

export function saveDeviceName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return getDeviceName(getDeviceId());
  try {
    localStorage.setItem(DEVICE_NAME_KEY, trimmed);
  } catch {
    // ignore storage quota errors
  }
  return trimmed;
}

// ---
// Summary:
// - Purpose: Date formatting and parsing helpers for Indonesian report standards
// - Role: Utility module
// - Depends on: none
// - Key Responsibilities: Convert between HTML5 date/datetime strings and standard Indonesian formats
// - Notes: Generates "Hari, DD Bulan YYYY" and "D Bulan YYYY HH:mm WIB"
// ---

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Format ISO date string (YYYY-MM-DD) to Indonesian format:
 * "Sabtu, 05 September 2026"
 */
export function formatDateToIndonesian(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const d = parseInt(dayStr, 10);

  const dateObj = new Date(y, m - 1, d);
  const dayName = INDONESIAN_DAYS[dateObj.getDay()];
  const dd = String(d).padStart(2, '0');
  const monthName = INDONESIAN_MONTHS[m - 1] || '';

  return `${dayName}, ${dd} ${monthName} ${y}`;
}

/**
 * Parse Indonesian date string back to ISO format (YYYY-MM-DD) for HTML5 input.
 * Accepts "Sabtu, 05 September 2026" or "5 September 2026".
 */
export function parseIndonesianToDate(str: string): string {
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const clean = str.replace(/^[a-zA-Z]+,\s*/, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length < 3) return '';

  const d = parts[0].replace(/[^0-9]/g, '').padStart(2, '0');
  const mIdx = INDONESIAN_MONTHS.findIndex(
    (m) => m.toLowerCase() === parts[1].toLowerCase()
  );
  if (mIdx === -1) return '';
  const m = String(mIdx + 1).padStart(2, '0');
  const y = parts[2].replace(/[^0-9]/g, '');

  if (!y || !m || !d) return '';
  return `${y}-${m}-${d}`;
}

/**
 * Format ISO datetime string (YYYY-MM-DDTHH:mm) to Indonesian realization format:
 * "5 September 2026 09:00 WIB"
 */
export function formatDateTimeToIndonesian(isoDateTime: string): string {
  if (!isoDateTime) return '';
  const [datePart, timePart] = isoDateTime.split('T');
  if (!datePart) return '';

  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const d = parseInt(dayStr, 10);

  const monthName = INDONESIAN_MONTHS[m - 1] || '';
  const time = timePart ? timePart.slice(0, 5) : '09:00';

  return `${d} ${monthName} ${y} ${time} WIB`;
}

/**
 * Parse Indonesian realization datetime string back to ISO datetime (YYYY-MM-DDTHH:mm).
 * Accepts "5 September 2026 09:00 WIB".
 */
export function parseIndonesianToDateTime(str: string): string {
  if (!str) return '';
  const parts = str.trim().split(/\s+/);
  if (parts.length < 4) return '';

  const d = parts[0].replace(/[^0-9]/g, '').padStart(2, '0');
  const mIdx = INDONESIAN_MONTHS.findIndex(
    (m) => m.toLowerCase() === parts[1].toLowerCase()
  );
  if (mIdx === -1) return '';
  const m = String(mIdx + 1).padStart(2, '0');
  const y = parts[2].replace(/[^0-9]/g, '');
  const time = parts[3] ? parts[3].slice(0, 5) : '09:00';

  if (!y || !m || !d) return '';
  return `${y}-${m}-${d}T${time}`;
}

/**
 * Get today's ISO date string (YYYY-MM-DD)
 */
export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get today's formatted Indonesian date string
 */
export function getTodayIndonesianDate(): string {
  return formatDateToIndonesian(getTodayIsoDate());
}

/**
 * Get current ISO datetime string (YYYY-MM-DDTHH:mm)
 */
export function getNowIsoDateTime(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

/**
 * Get current formatted Indonesian datetime string
 */
export function getNowIndonesianDateTime(): string {
  return formatDateTimeToIndonesian(getNowIsoDateTime());
}

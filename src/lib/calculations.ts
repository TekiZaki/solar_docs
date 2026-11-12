// ---
// Summary:
// - Purpose: Numerical calculation and formatting utilities for Solar PV analysis
// - Role: Domain math & string formatter
// - Depends on: src/types/schema.ts
// - Key Responsibilities: Calculate STC deviation percentage, parse Indonesian locale numbers, format decimals with commas
// - Notes: Strictly enforces formula (STC - MEAS) / STC * 100 per input_from_me.md
// ---

export function parseIndoNumber(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  // Replace comma with dot, remove any non-digit/dot/minus characters
  const clean = String(val).trim().replace(',', '.').replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatIndoNumber(val: number, decimals = 2): string {
  if (isNaN(val)) return '0,00';
  return val.toFixed(decimals).replace('.', ',');
}

export function calculateSTCDeviation(stcStr: string, measStr: string): string {
  const stc = parseIndoNumber(stcStr);
  const meas = parseIndoNumber(measStr);

  if (stc <= 0) return '0,00%';
  const deviation = Math.abs((stc - meas) / stc) * 100;
  return `${formatIndoNumber(deviation, 2)}%`;
}

export function updateConclusionWithLocation(template: string, lokasi: string): string {
  const caps = lokasi.trim() ? lokasi.trim().toUpperCase() : 'EMPTY';
  if (template.includes('[LOKASI_CAPS]')) {
    return template.replace(/\[LOKASI_CAPS\]/g, caps);
  }
  // If already replaced or default, ensure it matches:
  // "PV Module di <LOCATION> masih dalam kondisi baik..."
  const regex = /(PV Module di\s+)[^m]+(\s+masih dalam kondisi baik)/i;
  if (regex.test(template)) {
    return template.replace(regex, `$1${caps}$2`);
  }
  return template;
}

export function resolveWilayah(location: { lokasi?: string; alamat?: string; unitKerja?: string }): {
  caps: string;
  title: string;
} {
  const combined = `${location.alamat || ''} ${location.lokasi || ''} ${location.unitKerja || ''}`.toLowerCase();

  if (combined.includes('jakarta timur') || combined.includes('jaktim')) {
    return { caps: 'JAKARTA TIMUR', title: 'Jakarta Timur' };
  }
  if (combined.includes('jakarta barat') || combined.includes('jakbar')) {
    return { caps: 'JAKARTA BARAT', title: 'Jakarta Barat' };
  }
  if (combined.includes('jakarta selatan') || combined.includes('jaksel')) {
    return { caps: 'JAKARTA SELATAN', title: 'Jakarta Selatan' };
  }
  if (combined.includes('jakarta utara') || combined.includes('jakut')) {
    return { caps: 'JAKARTA UTARA', title: 'Jakarta Utara' };
  }
  if (
    combined.includes('kepulauan seribu') ||
    combined.includes('pulau tidung') ||
    combined.includes('pulau seribu')
  ) {
    return { caps: 'KABUPATEN ADM. KEPULAUAN SERIBU', title: 'Kabupaten Adm. Kepulauan Seribu' };
  }
  if (combined.includes('jakarta pusat') || combined.includes('jakpus')) {
    return { caps: 'JAKARTA PUSAT', title: 'Jakarta Pusat' };
  }
  return { caps: 'JAKARTA PUSAT', title: 'Jakarta Pusat' };
}

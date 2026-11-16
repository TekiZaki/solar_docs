// ---
// Summary:
// - Purpose: HTTP client adapter for reading and editing raw or structured JSON files via api/json_files.php
// - Role: Infrastructure API client
// - Depends on: api/json_files.php
// - Key Responsibilities: List all JSON files in public/data/, fetch file content, save raw JSON, patch dot-path, create and delete files
// ---

export interface JsonFileProgress {
  isReport: boolean;
  dataFilled: number;
  dataTotal: number;
  dataPercent: number;
  imagesFilled: number;
  imagesTotal: number;
  imagesPercent: number;
  overallPercent: number;
}

export interface JsonFileEntry {
  file: string;
  folder: string;
  name: string;
  lokasi: string;
  sizeBytes: number;
  updatedAt: string;
  updatedTs: number;
  progress: JsonFileProgress;
}

export interface JsonFileDetail {
  file: string;
  sizeBytes: number;
  updatedAt: string;
  data: unknown;
  raw: string;
}

const JSON_API_ENDPOINT = `${import.meta.env.BASE_URL}api/json_files.php`;

export async function fetchJsonFileList(): Promise<JsonFileEntry[]> {
  const res = await fetch(`${JSON_API_ENDPOINT}?_t=${Date.now()}`, { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || 'Gagal memuat daftar berkas JSON.');
  }
  return Array.isArray(json.files) ? (json.files as JsonFileEntry[]) : [];
}

export async function fetchJsonFileDetail(file: string): Promise<JsonFileDetail> {
  const res = await fetch(
    `${JSON_API_ENDPOINT}?file=${encodeURIComponent(file)}&_t=${Date.now()}`,
    { cache: 'no-store' }
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || `Gagal membuka ${file}`);
  }
  return json as JsonFileDetail;
}

export async function saveJsonFileRaw(file: string, raw: string): Promise<JsonFileDetail> {
  const res = await fetch(`${JSON_API_ENDPOINT}?action=save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', file, raw }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || 'Gagal menyimpan berkas JSON.');
  }
  return json as JsonFileDetail;
}

export async function saveJsonFileData(file: string, data: unknown): Promise<JsonFileDetail> {
  const res = await fetch(`${JSON_API_ENDPOINT}?action=save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', file, data }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || 'Gagal menyimpan data JSON.');
  }
  return json as JsonFileDetail;
}

export async function createJsonFileOnServer(file: string, data: unknown = {}): Promise<JsonFileDetail> {
  const res = await fetch(`${JSON_API_ENDPOINT}?action=create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', file, data }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || 'Gagal membuat berkas JSON.');
  }
  return json as JsonFileDetail;
}

export async function deleteJsonFileOnServer(file: string): Promise<void> {
  const res = await fetch(`${JSON_API_ENDPOINT}?action=delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', file }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || 'Gagal menghapus berkas JSON.');
  }
}

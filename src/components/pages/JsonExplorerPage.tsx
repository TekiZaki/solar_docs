// ---
// Summary:
// - Purpose: Dedicated JSON Explorer & Editor page for inspecting and editing all JSON files in raw or structured UI mode
// - Role: Presentation page component
// - Depends on: src/lib/jsonFilesApi.ts, ./JsonTreeEditor.tsx
// - Key Responsibilities: Browse JSON files in public/data/, edit via structured tree or raw JSON editor, validate syntax, copy terminal commands
// - Notes: Calm Scandinavian layout (warm off-white canvas, charcoal text, single teal accent, tabular-nums)
// ---

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchJsonFileList,
  fetchJsonFileDetail,
  saveJsonFileRaw,
  saveJsonFileData,
  createJsonFileOnServer,
  deleteJsonFileOnServer,
  type JsonFileEntry,
} from '../../lib/jsonFilesApi';
import { JsonTreeNode } from './JsonTreeEditor';

interface JsonExplorerPageProps {
  onBack: () => void;
}

type EditorTab = 'ui' | 'raw';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function setImmutableByPath(root: unknown, dotPath: string, nextValue: unknown): unknown {
  if (!dotPath) return nextValue;
  const parts = dotPath.split('.').filter(Boolean);
  const update = (cur: unknown, idx: number): unknown => {
    if (idx === parts.length) return nextValue;
    const key = parts[idx];
    if (Array.isArray(cur)) {
      const arrIdx = Number(key);
      const copy = [...cur];
      copy[arrIdx] = update(copy[arrIdx], idx + 1);
      return copy;
    }
    const obj =
      typeof cur === 'object' && cur !== null ? { ...(cur as Record<string, unknown>) } : {};
    obj[key] = update(obj[key], idx + 1);
    return obj;
  };
  return update(root, 0);
}

function deleteImmutableByPath(root: unknown, dotPath: string): unknown {
  const parts = dotPath.split('.').filter(Boolean);
  if (parts.length === 0) return root;
  const remove = (cur: unknown, idx: number): unknown => {
    const key = parts[idx];
    if (Array.isArray(cur)) {
      const arrIdx = Number(key);
      if (idx === parts.length - 1) {
        return cur.filter((_, i) => i !== arrIdx);
      }
      const copy = [...cur];
      copy[arrIdx] = remove(copy[arrIdx], idx + 1);
      return copy;
    }
    if (typeof cur === 'object' && cur !== null) {
      const copy = { ...(cur as Record<string, unknown>) };
      if (idx === parts.length - 1) {
        delete copy[key];
      } else {
        copy[key] = remove(copy[key], idx + 1);
      }
      return copy;
    }
    return cur;
  };
  return remove(root, 0);
}

export const JsonExplorerPage: React.FC<JsonExplorerPageProps> = ({ onBack }) => {
  const [files, setFiles] = useState<JsonFileEntry[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [fileQuery, setFileQuery] = useState('');
  const [folderFilter, setFolderFilter] = useState<string>('all');

  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileMeta, setFileMeta] = useState<{ sizeBytes: number; updatedAt: string } | null>(null);
  const [parsedData, setParsedData] = useState<unknown>(null);
  const [rawText, setRawText] = useState<string>('');
  const [savedRawSnapshot, setSavedRawSnapshot] = useState<string>('');

  const [activeTab, setActiveTab] = useState<EditorTab>('ui');
  const [treeSearch, setTreeSearch] = useState('');
  const [expandSignal, setExpandSignal] = useState<{
    mode: 'expand' | 'collapse';
    nonce: number;
  } | null>(null);

  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTerminalHelper, setShowTerminalHelper] = useState(false);
  const [copiedHint, setCopiedHint] = useState<string>('');
  const [lastPickedPath, setLastPickedPath] = useState<string>('location.lokasi');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const loadList = useCallback(async (selectAfter?: string) => {
    setListLoading(true);
    try {
      const list = await fetchJsonFileList();
      setFiles(list);
      if (selectAfter) {
        setSelectedFile(selectAfter);
      } else if (list.length > 0) {
        setSelectedFile((prev) => prev || list[0].file);
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat daftar berkas.',
      });
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadDetail = useCallback(async (targetFile: string) => {
    if (!targetFile) return;
    setIsDetailLoading(true);
    setStatusMessage(null);
    try {
      const detail = await fetchJsonFileDetail(targetFile);
      const formatted = JSON.stringify(detail.data, null, 2);
      setParsedData(detail.data);
      setRawText(formatted);
      setSavedRawSnapshot(formatted);
      setFileMeta({ sizeBytes: detail.sizeBytes, updatedAt: detail.updatedAt });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat isi berkas.',
      });
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFile) {
      loadDetail(selectedFile);
    }
  }, [selectedFile, loadDetail]);

  const rawSyntaxError = useMemo(() => {
    if (!rawText.trim()) return 'JSON tidak boleh kosong.';
    try {
      JSON.parse(rawText);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Sintaks JSON tidak valid.';
    }
  }, [rawText]);

  const isDirty = rawText !== savedRawSnapshot;

  const handleSave = useCallback(async () => {
    if (!selectedFile || isSaving) return;
    if (activeTab === 'raw' && rawSyntaxError) {
      setStatusMessage({ type: 'error', text: `Perbaiki sintaks JSON: ${rawSyntaxError}` });
      return;
    }
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const detail =
        activeTab === 'raw'
          ? await saveJsonFileRaw(selectedFile, rawText)
          : await saveJsonFileData(selectedFile, parsedData);
      const formatted = JSON.stringify(detail.data, null, 2);
      setParsedData(detail.data);
      setRawText(formatted);
      setSavedRawSnapshot(formatted);
      setFileMeta({ sizeBytes: detail.sizeBytes, updatedAt: detail.updatedAt });
      setStatusMessage({ type: 'success', text: `Tersimpan ke ${selectedFile}` });
      loadList(selectedFile);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan perubahan.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedFile, isSaving, activeTab, rawSyntaxError, rawText, parsedData, loadList]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  const handleSwitchTab = (nextTab: EditorTab) => {
    if (nextTab === activeTab) return;
    if (nextTab === 'ui') {
      try {
        setParsedData(JSON.parse(rawText));
        setActiveTab('ui');
      } catch (err) {
        setStatusMessage({
          type: 'error',
          text: `Tidak dapat beralih ke UI karena JSON belum valid: ${
            err instanceof Error ? err.message : ''
          }`,
        });
      }
    } else {
      setRawText(JSON.stringify(parsedData, null, 2));
      setActiveTab('raw');
    }
  };

  const handleTreeChange = (path: string, nextValue: unknown) => {
    const updated = setImmutableByPath(parsedData, path, nextValue);
    setParsedData(updated);
    setRawText(JSON.stringify(updated, null, 2));
  };

  const handleTreeDelete = (path: string) => {
    const updated = deleteImmutableByPath(parsedData, path);
    setParsedData(updated);
    setRawText(JSON.stringify(updated, null, 2));
  };

  const handleCopyPath = (path: string) => {
    setLastPickedPath(path);
    navigator.clipboard?.writeText(path);
    setCopiedHint(`Path "${path}" disalin`);
    setTimeout(() => setCopiedHint(''), 2500);
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newFileName.trim();
    if (!cleaned) return;
    const targetPath = cleaned.includes('/') ? cleaned : `reports/${cleaned}`;
    try {
      const created = await createJsonFileOnServer(targetPath, {});
      setNewFileName('');
      setIsCreatingFile(false);
      await loadList(created.file);
      setStatusMessage({ type: 'success', text: `Berkas ${created.file} dibuat.` });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal membuat berkas.',
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedFile) return;
    if (!window.confirm(`Hapus berkas "${selectedFile}" secara permanen?`)) return;
    try {
      await deleteJsonFileOnServer(selectedFile);
      const remaining = files.filter((f) => f.file !== selectedFile);
      setFiles(remaining);
      const nextFile = remaining[0]?.file || '';
      setSelectedFile(nextFile);
      if (!nextFile) {
        setParsedData(null);
        setRawText('');
        setSavedRawSnapshot('');
      }
      setStatusMessage({ type: 'success', text: `Berkas ${selectedFile} dihapus.` });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menghapus berkas.',
      });
    }
  };

  const folders = useMemo(() => {
    const set = new Set(files.map((f) => f.folder));
    return ['all', ...Array.from(set)];
  }, [files]);

  const filteredFiles = useMemo(() => {
    const q = fileQuery.trim().toLowerCase();
    return files.filter((f) => {
      if (folderFilter !== 'all' && f.folder !== folderFilter) return false;
      if (!q) return true;
      return (
        f.file.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.lokasi.toLowerCase().includes(q)
      );
    });
  }, [files, folderFilter, fileQuery]);

  const lineCount = rawText ? rawText.split('\n').length : 0;
  const apiUrlBase = `${window.location.origin}${import.meta.env.BASE_URL}api/json_files.php`;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1E293B] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-300">
        <div className="w-full md:w-[90vw] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-medium text-slate-700 hover:text-[#1E293B] bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-md transition"
            >
              &larr; Beranda
            </button>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-[#1E293B] leading-tight">
                JSON Explorer & Editor
              </h1>
              <p className="text-xs text-slate-500">
                Inspeksi dan edit berkas JSON dalam mode terstruktur atau raw JSON
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTerminalHelper((prev) => !prev)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md border transition ${
                showTerminalHelper
                  ? 'bg-teal-50 text-teal-800 border-teal-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {showTerminalHelper ? 'Tutup Panduan Terminal' : 'Perintah Terminal'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedFile || isSaving || (activeTab === 'raw' && Boolean(rawSyntaxError))}
              className="text-xs font-semibold bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-500 text-white px-3.5 py-1.5 rounded-md transition"
              title="Simpan perubahan (Ctrl+S)"
            >
              {isSaving ? 'Menyimpan...' : isDirty ? 'Simpan Perubahan *' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full md:w-[90vw] mx-auto px-4 py-5 flex-1 flex flex-col gap-4">
        {statusMessage && (
          <div
            className={`px-3.5 py-2 rounded-md border text-xs flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-teal-50 border-teal-700 text-teal-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-[11px] underline ml-4"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Progressive Disclosure: Terminal Helper */}
        {showTerminalHelper && (
          <section className="bg-white border border-slate-300 rounded-md p-4 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Contoh Perintah Terminal untuk Berkas Aktif
              </h2>
              <span className="text-[11px] text-slate-500">
                Lihat panduan lengkap di <code className="font-mono">myapp/JSON_TERMINAL_GUIDE.md</code>
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-50 border border-slate-300 rounded-md p-2.5 space-y-1">
                <div className="text-[11px] font-sans font-medium text-slate-600">
                  PHP CLI (langsung di folder myapp/)
                </div>
                <pre className="overflow-x-auto text-[11px] text-[#1E293B] whitespace-pre-wrap break-all">
{`php public/api/json_files.php get "${selectedFile || 'reports/FILE.json'}" --path="${lastPickedPath}"
php public/api/json_files.php set "${selectedFile || 'reports/FILE.json'}" "${lastPickedPath}" "Nilai Baru"`}
                </pre>
              </div>
              <div className="bg-slate-50 border border-slate-300 rounded-md p-2.5 space-y-1">
                <div className="text-[11px] font-sans font-medium text-slate-600">
                  HTTP curl (via web server / localhost)
                </div>
                <pre className="overflow-x-auto text-[11px] text-[#1E293B] whitespace-pre-wrap break-all">
{`curl -s "${apiUrlBase}?file=${encodeURIComponent(selectedFile || 'reports/FILE.json')}"
curl -X PATCH "${apiUrlBase}" -H "Content-Type: application/json" -d '{"file":"${selectedFile || 'reports/FILE.json'}","path":"${lastPickedPath}","value":"Nilai Baru"}'`}
                </pre>
              </div>
            </div>
          </section>
        )}

        {/* Asymmetric 2-Column Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start flex-1">
          {/* Sidebar: File List */}
          <aside className="lg:col-span-4 xl:col-span-3 bg-white border border-slate-300 rounded-md overflow-hidden">
            <div className="p-3 border-b border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1E293B]">
                  Berkas JSON{' '}
                  <span className="font-mono text-slate-500 tabular-nums">
                    ({filteredFiles.length})
                  </span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsCreatingFile((prev) => !prev)}
                    className="text-[11px] font-medium text-teal-800 hover:bg-teal-50 border border-slate-300 px-2 py-0.5 rounded-md transition"
                  >
                    + Berkas
                  </button>
                  <button
                    type="button"
                    onClick={() => loadList(selectedFile)}
                    className="text-[11px] text-slate-600 hover:text-[#1E293B] border border-slate-300 px-2 py-0.5 rounded-md transition"
                  >
                    Muat Ulang
                  </button>
                </div>
              </div>

              {isCreatingFile && (
                <form onSubmit={handleCreateFile} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="reports/nama_berkas.json"
                    className="flex-1 text-xs font-mono px-2 py-1 rounded-md border border-slate-300 focus:outline-none focus:border-teal-700"
                  />
                  <button
                    type="submit"
                    className="text-xs font-medium bg-teal-700 text-white px-2.5 py-1 rounded-md"
                  >
                    Buat
                  </button>
                </form>
              )}

              <input
                type="search"
                value={fileQuery}
                onChange={(e) => setFileQuery(e.target.value)}
                placeholder="Cari berkas atau lokasi..."
                className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-300 bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-teal-700"
              />

              <div className="flex flex-wrap gap-1">
                {folders.map((folder) => (
                  <button
                    key={folder}
                    type="button"
                    onClick={() => setFolderFilter(folder)}
                    className={`text-[11px] px-2 py-0.5 rounded-md border transition ${
                      folderFilter === folder
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {folder === 'all' ? 'Semua' : folder}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-200">
              {listLoading ? (
                <div className="p-4 text-xs text-slate-500">Memuat daftar berkas...</div>
              ) : filteredFiles.length === 0 ? (
                <div className="p-4 text-xs text-slate-500">Tidak ada berkas JSON yang cocok.</div>
              ) : (
                filteredFiles.map((item) => {
                  const isActive = item.file === selectedFile;
                  return (
                    <button
                      key={item.file}
                      type="button"
                      onClick={() => setSelectedFile(item.file)}
                      className={`w-full text-left px-3 py-2.5 transition block ${
                        isActive
                          ? 'bg-teal-50/70 border-l-2 border-l-teal-700'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[#1E293B] truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 tabular-nums shrink-0">
                          {formatBytes(item.sizeBytes)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.lokasi || item.file}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-mono tabular-nums">
                        <span>{item.folder}</span>
                        <span>{item.updatedAt}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Main Editor Workspace */}
          <section className="lg:col-span-8 xl:col-span-9 bg-white border border-slate-300 rounded-md overflow-hidden flex flex-col">
            {!selectedFile ? (
              <div className="p-10 text-center text-xs text-slate-500">
                Pilih satu berkas JSON di daftar sebelah kiri untuk mulai melihat atau mengedit.
              </div>
            ) : (
              <>
                {/* File Info & Mode Switch */}
                <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-semibold text-[#1E293B] truncate">
                      {selectedFile}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums flex flex-wrap items-center gap-3 mt-0.5">
                      {fileMeta && (
                        <>
                          <span>{formatBytes(fileMeta.sizeBytes)}</span>
                          <span>{lineCount} baris</span>
                          <span>Diubah: {fileMeta.updatedAt}</span>
                        </>
                      )}
                      {copiedHint && <span className="text-teal-700 font-sans">{copiedHint}</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => handleSwitchTab('ui')}
                        className={`text-xs font-medium px-3 py-1 rounded transition ${
                          activeTab === 'ui'
                            ? 'bg-teal-700 text-white'
                            : 'text-slate-600 hover:text-[#1E293B]'
                        }`}
                      >
                        Tampilan UI
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchTab('raw')}
                        className={`text-xs font-medium px-3 py-1 rounded transition ${
                          activeTab === 'raw'
                            ? 'bg-teal-700 text-white'
                            : 'text-slate-600 hover:text-[#1E293B]'
                        }`}
                      >
                        Raw JSON
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => loadDetail(selectedFile)}
                      className="text-xs text-slate-600 hover:text-[#1E293B] bg-white border border-slate-300 px-2.5 py-1.5 rounded-md transition"
                    >
                      Muat Ulang
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="text-xs text-rose-700 hover:bg-rose-50 bg-white border border-slate-300 px-2.5 py-1.5 rounded-md transition"
                    >
                      Hapus Berkas
                    </button>
                  </div>
                </div>

                {isDetailLoading ? (
                  <div className="p-8 text-xs text-slate-500">Memuat data JSON...</div>
                ) : activeTab === 'ui' ? (
                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                      <input
                        type="search"
                        value={treeSearch}
                        onChange={(e) => setTreeSearch(e.target.value)}
                        placeholder="Filter kunci atau nilai di dalam JSON..."
                        className="flex-1 min-w-[200px] text-xs px-2.5 py-1.5 rounded-md border border-slate-300 bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-teal-700"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandSignal((prev) => ({
                              mode: 'expand',
                              nonce: (prev?.nonce ?? 0) + 1,
                            }))
                          }
                          className="text-xs text-slate-600 hover:text-[#1E293B] border border-slate-300 bg-white px-2.5 py-1 rounded-md transition"
                        >
                          Buka Semua
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandSignal((prev) => ({
                              mode: 'collapse',
                              nonce: (prev?.nonce ?? 0) + 1,
                            }))
                          }
                          className="text-xs text-slate-600 hover:text-[#1E293B] border border-slate-300 bg-white px-2.5 py-1 rounded-md transition"
                        >
                          Tutup Semua
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[62vh] overflow-y-auto pr-1 text-left">
                      {parsedData !== null && parsedData !== undefined ? (
                        <JsonTreeNode
                          label="root"
                          value={parsedData}
                          path=""
                          depth={0}
                          searchQuery={treeSearch.trim()}
                          expandSignal={expandSignal}
                          onChangeValue={handleTreeChange}
                          onDeletePath={handleTreeDelete}
                          onCopyPath={handleCopyPath}
                        />
                      ) : (
                        <div className="text-xs text-slate-500 py-4">Data kosong.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              setRawText(JSON.stringify(JSON.parse(rawText), null, 2));
                            } catch {
                              // handled by rawSyntaxError banner
                            }
                          }}
                          disabled={Boolean(rawSyntaxError)}
                          className="text-xs text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 border border-slate-300 px-2.5 py-1 rounded-md transition"
                        >
                          Format JSON
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              setRawText(JSON.stringify(JSON.parse(rawText)));
                            } catch {
                              // handled by rawSyntaxError banner
                            }
                          }}
                          disabled={Boolean(rawSyntaxError)}
                          className="text-xs text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 border border-slate-300 px-2.5 py-1 rounded-md transition"
                        >
                          Minify
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(rawText);
                            setCopiedHint('Raw JSON disalin');
                            setTimeout(() => setCopiedHint(''), 2500);
                          }}
                          className="text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-2.5 py-1 rounded-md transition"
                        >
                          Salin JSON
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob([rawText], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = selectedFile.split('/').pop() || 'data.json';
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-2.5 py-1 rounded-md transition"
                        >
                          Unduh .json
                        </button>
                      </div>

                      {isDirty && (
                        <button
                          type="button"
                          onClick={() => setRawText(savedRawSnapshot)}
                          className="text-xs text-slate-600 hover:text-[#1E293B] underline"
                        >
                          Batalkan Perubahan
                        </button>
                      )}
                    </div>

                    {rawSyntaxError && (
                      <div className="px-3 py-2 bg-rose-50 border border-rose-300 rounded-md text-xs text-rose-900 font-mono">
                        Sintaks JSON tidak valid: {rawSyntaxError}
                      </div>
                    )}

                    <textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      spellCheck={false}
                      className="w-full h-[58vh] font-mono text-xs leading-relaxed p-3 rounded-md border border-slate-300 bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-teal-700 resize-y"
                    />
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

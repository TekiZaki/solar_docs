// ---
// Summary:
// - Purpose: Interactive collapsible JSON tree viewer and inline editor for objects, arrays, and primitive values
// - Role: Presentation & inline editing component
// - Depends on: React
// - Key Responsibilities: Render hierarchical JSON data cleanly, edit values inline, add/remove keys, filter by key/value, copy dot-path
// ---

import React, { useState } from 'react';

interface JsonTreeNodeProps {
  label: string;
  value: unknown;
  path: string;
  depth: number;
  searchQuery: string;
  expandSignal: { mode: 'expand' | 'collapse'; nonce: number } | null;
  onChangeValue: (path: string, nextValue: unknown) => void;
  onDeletePath: (path: string) => void;
  onCopyPath: (path: string) => void;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function matchesSearch(label: string, value: unknown, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (label.toLowerCase().includes(q)) return true;
  if (value === null) return 'null'.includes(q);
  if (typeof value !== 'object') return String(value).toLowerCase().includes(q);
  if (Array.isArray(value)) {
    return value.some((item, idx) => matchesSearch(String(idx), item, q));
  }
  return Object.entries(value as Record<string, unknown>).some(([k, v]) =>
    matchesSearch(k, v, q)
  );
}

function parseInputDraft(raw: string): unknown {
  const t = raw.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null') return null;
  if (t !== '' && !Number.isNaN(Number(t)) && !/^0\d+/.test(t)) return Number(t);
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try {
      return JSON.parse(t);
    } catch {
      return raw;
    }
  }
  return raw;
}

export const JsonTreeNode: React.FC<JsonTreeNodeProps> = ({
  label,
  value,
  path,
  depth,
  searchQuery,
  expandSignal,
  onChangeValue,
  onDeletePath,
  onCopyPath,
}) => {
  const isContainer = Array.isArray(value) || isPlainObject(value);
  const [expanded, setExpanded] = useState<boolean>(depth < 1);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  React.useEffect(() => {
    if (!expandSignal) return;
    setExpanded(expandSignal.mode === 'expand');
  }, [expandSignal]);

  if (searchQuery && !matchesSearch(label, value, searchQuery)) {
    return null;
  }

  const isExpanded = searchQuery ? true : expanded;

  const handleAddChild = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedVal = parseInputDraft(newKeyValue);
    if (Array.isArray(value)) {
      onChangeValue(path, [...value, parsedVal]);
      setNewKeyValue('');
      setIsAdding(false);
      return;
    }
    if (isPlainObject(value)) {
      const k = newKeyName.trim();
      if (!k) return;
      onChangeValue(path, { ...value, [k]: parsedVal });
      setNewKeyName('');
      setNewKeyValue('');
      setIsAdding(false);
    }
  };

  if (isContainer) {
    const entries: Array<[string, unknown]> = Array.isArray(value)
      ? value.map((item, idx) => [String(idx), item])
      : Object.entries(value as Record<string, unknown>);
    const countLabel = Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`;

    return (
      <div className={depth > 0 ? 'border-l border-slate-200 pl-3 ml-1.5' : ''}>
        <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-slate-100/70 transition">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-2 text-left min-w-0 flex-1"
          >
            <span className="font-mono text-[11px] text-slate-500 w-3 inline-block shrink-0">
              {isExpanded ? 'v' : '>'}
            </span>
            <span className="font-mono text-xs font-semibold text-[#1E293B] truncate">
              {label}
            </span>
            <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
              {countLabel}
            </span>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            {path && (
              <button
                type="button"
                onClick={() => onCopyPath(path)}
                className="text-[11px] text-slate-500 hover:text-teal-800 px-1.5 py-0.5 rounded hover:bg-white border border-transparent hover:border-slate-300 transition"
                title={`Salin path: ${path}`}
              >
                Path
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setExpanded(true);
                setIsAdding((prev) => !prev);
              }}
              className="text-[11px] text-teal-800 hover:bg-teal-50 px-1.5 py-0.5 rounded border border-slate-300 bg-white transition"
            >
              {Array.isArray(value) ? '+ Item' : '+ Kunci'}
            </button>
            {path && (
              <button
                type="button"
                onClick={() => onDeletePath(path)}
                className="text-[11px] text-rose-700 hover:bg-rose-50 px-1.5 py-0.5 rounded border border-slate-300 bg-white transition"
              >
                Hapus
              </button>
            )}
          </div>
        </div>

        {isAdding && (
          <form
            onSubmit={handleAddChild}
            className="flex flex-wrap items-center gap-2 my-1.5 ml-5 p-2 bg-slate-50 border border-slate-300 rounded-md"
          >
            {!Array.isArray(value) && (
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Nama kunci"
                className="text-xs font-mono px-2 py-1 rounded-md border border-slate-300 bg-white focus:outline-none focus:border-teal-700 w-36"
              />
            )}
            <input
              type="text"
              value={newKeyValue}
              onChange={(e) => setNewKeyValue(e.target.value)}
              placeholder='Nilai (mis. teks, 123, true, {"a":1})'
              className="text-xs font-mono px-2 py-1 rounded-md border border-slate-300 bg-white focus:outline-none focus:border-teal-700 flex-1 min-w-[160px]"
            />
            <button
              type="submit"
              className="text-xs font-medium bg-teal-700 hover:bg-teal-800 text-white px-2.5 py-1 rounded-md transition"
            >
              Tambah
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1"
            >
              Batal
            </button>
          </form>
        )}

        {isExpanded && (
          <div className="space-y-0.5">
            {entries.length === 0 ? (
              <div className="text-xs text-slate-400 italic py-1 pl-6">Kosong</div>
            ) : (
              entries.map(([k, v]) => {
                const childPath = path ? `${path}.${k}` : k;
                return (
                  <JsonTreeNode
                    key={childPath}
                    label={k}
                    value={v}
                    path={childPath}
                    depth={depth + 1}
                    searchQuery={searchQuery}
                    expandSignal={expandSignal}
                    onChangeValue={onChangeValue}
                    onDeletePath={onDeletePath}
                    onCopyPath={onCopyPath}
                  />
                );
              })
            )}
          </div>
        )}
      </div>
    );
  }

  // Primitive leaf editor
  const valueType = value === null ? 'null' : typeof value;

  return (
    <div className="border-l border-slate-200 pl-3 ml-1.5 py-1.5 px-2 rounded-md hover:bg-slate-100/60 transition flex flex-col sm:flex-row sm:items-start gap-2">
      <div className="sm:w-56 shrink-0 flex items-center justify-between gap-2 pt-1">
        <span className="font-mono text-xs font-medium text-[#1E293B] truncate" title={path}>
          {label}
        </span>
        <span className="font-mono text-[10px] text-slate-400 uppercase shrink-0">
          {valueType}
        </span>
      </div>

      <div className="flex-1 min-w-0 flex items-start gap-1.5">
        {valueType === 'boolean' && (
          <button
            type="button"
            onClick={() => onChangeValue(path, !value)}
            className={`text-xs font-mono px-2.5 py-1 rounded-md border transition ${
              value
                ? 'bg-teal-50 text-teal-800 border-teal-700'
                : 'bg-white text-slate-600 border-slate-300'
            }`}
          >
            {String(value)}
          </button>
        )}

        {valueType === 'number' && (
          <input
            type="number"
            step="any"
            value={Number.isFinite(value as number) ? (value as number) : 0}
            onChange={(e) => {
              const num = Number(e.target.value);
              onChangeValue(path, Number.isNaN(num) ? 0 : num);
            }}
            className="w-full sm:w-48 text-xs font-mono tabular-nums px-2.5 py-1 rounded-md border border-slate-300 bg-white focus:outline-none focus:border-teal-700"
          />
        )}

        {valueType === 'null' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 bg-slate-100 border border-slate-300 px-2 py-1 rounded-md">
              null
            </span>
            <button
              type="button"
              onClick={() => onChangeValue(path, '')}
              className="text-[11px] text-teal-800 hover:underline"
            >
              Ubah ke teks
            </button>
          </div>
        )}

        {valueType === 'string' && (() => {
          const strVal = value as string;
          const isLong = strVal.length > 90 || strVal.includes('\n');
          if (isLong) {
            return (
              <textarea
                rows={Math.min(6, Math.max(2, strVal.split('\n').length))}
                value={strVal}
                onChange={(e) => onChangeValue(path, e.target.value)}
                className="w-full text-xs font-mono px-2.5 py-1.5 rounded-md border border-slate-300 bg-white focus:outline-none focus:border-teal-700 leading-relaxed"
              />
            );
          }
          return (
            <input
              type="text"
              value={strVal}
              onChange={(e) => onChangeValue(path, e.target.value)}
              className="w-full text-xs font-mono px-2.5 py-1 rounded-md border border-slate-300 bg-white focus:outline-none focus:border-teal-700"
            />
          );
        })()}

        <button
          type="button"
          onClick={() => onCopyPath(path)}
          className="text-[11px] text-slate-500 hover:text-teal-800 px-1.5 py-1 rounded-md border border-transparent hover:border-slate-300 hover:bg-white transition shrink-0"
          title={`Salin path: ${path}`}
        >
          Path
        </button>
        <button
          type="button"
          onClick={() => onDeletePath(path)}
          className="text-[11px] text-rose-700 hover:bg-rose-50 px-1.5 py-1 rounded-md border border-transparent hover:border-slate-300 transition shrink-0"
          title={`Hapus kunci: ${path}`}
        >
          Hapus
        </button>
      </div>
    </div>
  );
};

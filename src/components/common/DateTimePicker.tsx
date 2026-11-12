// ---
// Summary:
// - Purpose: Custom 24-hour date and time picker with tabbed calendar, digital steppers, and quick-preset time grid
// - Role: UI Selection Component
// - Depends on: src/lib/dateUtils.ts
// - Key Responsibilities: Provide clean calendar grid, digital steppers, and one-tap work schedule time selection
// ---

import React, { useState, useRef, useEffect } from 'react';
import { INDONESIAN_MONTHS } from '../../lib/dateUtils';

interface DateTimePickerProps {
  value: string; // ISO format: YYYY-MM-DDTHH:mm or YYYY-MM-DD
  onChange: (isoValue: string) => void;
  placeholder?: string;
  mode?: 'datetime' | 'date';
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_5 = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const QUICK_PRESETS_ROW = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];
const PRESET_MORNING = ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30'];
const PRESET_AFTERNOON = ['11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Pilih jadwal...',
  mode = 'datetime',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'date' | 'time'>('date');
  const [timeView, setTimeView] = useState<'presets' | 'hours' | 'minutes'>('presets');
  const containerRef = useRef<HTMLDivElement>(null);

  const safeIso = value && !value.includes('T') ? `${value}T09:00` : value;
  const parsedDate = safeIso ? new Date(safeIso) : null;
  const isValidDate = parsedDate !== null && !isNaN(parsedDate.getTime());

  const initialYear = isValidDate ? parsedDate.getFullYear() : new Date().getFullYear();
  const initialMonth = isValidDate ? parsedDate.getMonth() : new Date().getMonth();

  const [viewYear, setViewYear] = useState<number>(initialYear);
  const [viewMonth, setViewMonth] = useState<number>(initialMonth);

  const selectedDateStr = isValidDate ? safeIso.split('T')[0] : '';
  const timePart = isValidDate ? safeIso.split('T')[1] || '09:00' : '09:00';
  const [hour, minute] = timePart.split(':');

  useEffect(() => {
    if (isValidDate) {
      setViewYear(parsedDate.getFullYear());
      setViewMonth(parsedDate.getMonth());
    }
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const yStr = String(viewYear);
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    if (mode === 'date') {
      onChange(`${yStr}-${mStr}-${dStr}`);
      setIsOpen(false);
      return;
    }
    const hStr = hour || '09';
    const minStr = minute || '00';
    onChange(`${yStr}-${mStr}-${dStr}T${hStr}:${minStr}`);
  };

  const handleHourChange = (newHour: string) => {
    const baseDate = selectedDateStr || `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
    onChange(`${baseDate}T${newHour}:${minute || '00'}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    const baseDate = selectedDateStr || `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
    onChange(`${baseDate}T${hour || '09'}:${newMinute}`);
  };

  const handleApplyTimePreset = (timeStr: string) => {
    const [newH, newM] = timeStr.split(':');
    const baseDate = selectedDateStr || `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
    onChange(`${baseDate}T${newH}:${newM}`);
  };

  const stepHour = (delta: number) => {
    const currentH = parseInt(hour || '9', 10);
    const nextH = (currentH + delta + 24) % 24;
    handleHourChange(String(nextH).padStart(2, '0'));
  };

  const stepMinute = (delta: number) => {
    const currentM = parseInt(minute || '0', 10);
    const nextM = (currentM + delta + 60) % 60;
    handleMinuteChange(String(nextM).padStart(2, '0'));
  };

  const handleSetCurrentNow = () => {
    const now = new Date();
    const yStr = String(now.getFullYear());
    const mStr = String(now.getMonth() + 1).padStart(2, '0');
    const dStr = String(now.getDate()).padStart(2, '0');
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    if (mode === 'date') {
      onChange(`${yStr}-${mStr}-${dStr}`);
      setIsOpen(false);
      return;
    }
    const hStr = String(now.getHours()).padStart(2, '0');
    const minStr = String(now.getMinutes()).padStart(2, '0');
    onChange(`${yStr}-${mStr}-${dStr}T${hStr}:${minStr}`);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const shortMonth = isValidDate
    ? INDONESIAN_MONTHS[parsedDate.getMonth()]?.slice(0, 3) || ''
    : '';

  const displayLabel = isValidDate
    ? mode === 'date'
      ? `${String(parsedDate.getDate()).padStart(2, '0')} ${shortMonth} ${parsedDate.getFullYear()}`
      : `${String(parsedDate.getDate()).padStart(2, '0')} ${shortMonth} ${parsedDate.getFullYear()}, ${timePart}`
    : placeholder;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setActiveTab('date');
        }}
        className="w-full h-8 text-xs px-2.5 rounded border border-slate-300 bg-white text-slate-800 flex items-center justify-between shadow-sm hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
      >
        <span className="truncate font-sans font-medium text-slate-700">{displayLabel}</span>
        <svg className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-300 rounded-lg shadow-2xl z-50 p-3 space-y-2.5 text-xs">
          {/* Top Mode Selector Tabs */}
          {mode === 'datetime' && (
            <div className="grid grid-cols-2 p-0.5 bg-slate-100 rounded border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('date')}
                className={`py-1 rounded font-medium transition ${
                  activeTab === 'date'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kalender
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('time')}
                className={`py-1 rounded font-medium transition flex items-center justify-center gap-1 ${
                  activeTab === 'time'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Jam:</span>
                <span className="font-mono font-bold text-slate-900">{hour || '09'}:{minute || '00'}</span>
              </button>
            </div>
          )}

          {/* TAB 1: CALENDAR VIEW */}
          {activeTab === 'date' && (
            <div className="space-y-2.5">
              {/* Month & Year Navigation */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-7 h-7 rounded flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition font-bold"
                  title="Bulan sebelumnya"
                >
                  &larr;
                </button>
                <span className="font-bold text-slate-900 text-xs">
                  {INDONESIAN_MONTHS[viewMonth]} {viewYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-7 h-7 rounded flex items-center justify-center text-slate-700 hover:bg-slate-100 border border-slate-200 transition font-bold"
                  title="Bulan berikutnya"
                >
                  &rarr;
                </button>
              </div>

              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase">
                <span>Min</span>
                <span>Sen</span>
                <span>Sel</span>
                <span>Rab</span>
                <span>Kam</span>
                <span>Jum</span>
                <span>Sab</span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`blank-${i}`} className="h-7" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const dayIso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = selectedDateStr === dayIso;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      className={`h-7 w-full text-xs rounded transition flex items-center justify-center font-medium ${
                        isSelected
                          ? 'bg-slate-900 text-white font-bold shadow-sm'
                          : 'text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Quick Time Access Footer inside Calendar */}
              {mode === 'datetime' && (
                <div className="border-t border-slate-100 pt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 text-[11px]">
                      Jam: <span className="font-mono font-bold text-slate-900">{hour || '09'}:{minute || '00'} WIB</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('time')}
                      className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 underline"
                    >
                      Atur Waktu &rarr;
                    </button>
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                    {QUICK_PRESETS_ROW.map((preset) => {
                      const isActive = `${hour || '09'}:${minute || '00'}` === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleApplyTimePreset(preset)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition shrink-0 ${
                            isActive
                              ? 'bg-slate-900 text-white border-slate-900 font-bold'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DEDICATED EASY TIME PICKER VIEW */}
          {activeTab === 'time' && mode === 'datetime' && (
            <div className="space-y-3 pt-1">
              {/* Digital Time Stepper Display */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between">
                {/* Hour Controller */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => stepHour(-1)}
                    className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center transition"
                    title="Kurangi 1 jam"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeView('hours')}
                    className="px-2.5 h-7 rounded border border-slate-900 bg-white font-mono font-bold text-sm text-slate-900 shadow-sm"
                    title="Buka pilihan semua jam"
                  >
                    {hour || '09'}
                  </button>
                  <button
                    type="button"
                    onClick={() => stepHour(1)}
                    className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center transition"
                    title="Tambah 1 jam"
                  >
                    +
                  </button>
                </div>

                <span className="font-mono font-bold text-slate-400 text-base">:</span>

                {/* Minute Controller */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => stepMinute(-5)}
                    className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center transition"
                    title="Kurangi 5 menit"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeView('minutes')}
                    className="px-2.5 h-7 rounded border border-slate-900 bg-white font-mono font-bold text-sm text-slate-900 shadow-sm"
                    title="Buka pilihan menit"
                  >
                    {minute || '00'}
                  </button>
                  <button
                    type="button"
                    onClick={() => stepMinute(5)}
                    className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center transition"
                    title="Tambah 5 menit"
                  >
                    +
                  </button>
                </div>

                <span className="text-[11px] font-bold text-slate-500 font-mono">WIB</span>
              </div>

              {/* Time Sub-view Navigation */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-[11px]">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setTimeView('presets')}
                    className={`px-2 py-0.5 rounded font-medium transition ${
                      timeView === 'presets'
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Jadwal Cepat
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeView('hours')}
                    className={`px-2 py-0.5 rounded font-medium transition ${
                      timeView === 'hours'
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Jam (00-23)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeView('minutes')}
                    className={`px-2 py-0.5 rounded font-medium transition ${
                      timeView === 'minutes'
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Menit
                  </button>
                </div>
              </div>

              {/* View 1: Presets by Shift */}
              {timeView === 'presets' && (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Pagi (Inspeksi & Cuci)
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {PRESET_MORNING.map((preset) => {
                        const isSelected = `${hour || '09'}:${minute || '00'}` === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleApplyTimePreset(preset)}
                            className={`py-1 rounded text-xs font-mono transition border ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-sm'
                                : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Siang / Sore (Pasca Cuci)
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {PRESET_AFTERNOON.map((preset) => {
                        const isSelected = `${hour || '09'}:${minute || '00'}` === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleApplyTimePreset(preset)}
                            className={`py-1 rounded text-xs font-mono transition border ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-sm'
                                : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* View 2: All 24 Hours Grid */}
              {timeView === 'hours' && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 block">
                    Pilih Jam (00 - 23):
                  </span>
                  <div className="grid grid-cols-6 gap-1 max-h-36 overflow-y-auto p-0.5">
                    {HOURS_24.map((h) => {
                      const isSelected = (hour || '09') === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => {
                            handleHourChange(h);
                            setTimeView('minutes');
                          }}
                          className={`py-1.5 rounded text-xs font-mono transition border ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-sm'
                              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* View 3: Minutes Selection */}
              {timeView === 'minutes' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span>Interval 5 Menit:</span>
                    <div className="flex gap-1 font-normal">
                      <button
                        type="button"
                        onClick={() => stepMinute(-1)}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200"
                      >
                        -1 m
                      </button>
                      <button
                        type="button"
                        onClick={() => stepMinute(1)}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200"
                      >
                        +1 m
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {MINUTES_5.map((m) => {
                      const isSelected = (minute || '00') === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleMinuteChange(m)}
                          className={`py-1.5 rounded text-xs font-mono transition border ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-sm'
                              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          :{m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSetCurrentNow}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium underline"
            >
              Set Sekarang
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1 rounded transition shadow-sm"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
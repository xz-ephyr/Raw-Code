import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';

interface DateTimePickerProps {
  value: number | null;
  onChange: (ts: number | null) => void;
}

function pad(n: number) { return n.toString().padStart(2, '0'); }

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const [mode, setMode] = useState<'none' | 'now' | 'scheduled'>('none');
  const now = new Date();

  const d = value ? new Date(value) : now;
  const [year, setYear] = useState(d.getFullYear());
  const [month, setMonth] = useState(d.getMonth() + 1);
  const [day, setDay] = useState(d.getDate());
  const [hours, setHours] = useState(d.getHours() % 12 || 12);
  const [minutes, setMinutes] = useState(d.getMinutes());
  const [ampm, setAmpm] = useState(d.getHours() >= 12 ? 'PM' : 'AM');
  const [showPicker, setShowPicker] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buildDate = () => {
    const h = ampm === 'PM' ? (hours % 12) + 12 : hours % 12;
    return new Date(year, month - 1, day, h, minutes);
  };

  const commit = () => {
    onChange(buildDate().getTime());
    setShowPicker(false);
  };

  if (mode === 'none') {
    return (
      <div className="flex items-center gap-2 w-full">
        <button
          type="button"
          onClick={() => setMode('now')}
          className="flex-1 px-3 py-2 rounded-[6px] border border-border bg-sidebar text-sm text-foreground hover:bg-muted/50 transition-colors"
        >
          Run Now
        </button>
        <button
          type="button"
          onClick={() => { setMode('scheduled'); setShowPicker(true); }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[6px] border border-border bg-sidebar text-sm text-foreground hover:bg-muted/50 transition-colors"
        >
          <Clock size={14} />
          Schedule
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-[6px] border border-border bg-sidebar text-sm text-foreground hover:bg-muted/50 transition-colors"
      >
        <Calendar size={14} className="text-muted-foreground" />
        <span>{pad(month)}/{pad(day)}/{year}</span>
        <Clock size={14} className="text-muted-foreground" />
        <span>{pad(hours)}:{pad(minutes)} {ampm}</span>
      </button>

      {showPicker && (
        <div className="absolute z-20 mt-1 p-4 rounded-[6px] border border-border bg-card shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 w-72">
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Month</label>
              <input
                type="number"
                min={1} max={12}
                value={month}
                onChange={(e) => setMonth(Math.min(12, Math.max(1, +e.target.value)))}
                className="w-full px-2 py-1 rounded-[6px] border border-border bg-sidebar text-sm text-foreground mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Day</label>
              <input
                type="number"
                min={1} max={31}
                value={day}
                onChange={(e) => setDay(Math.min(31, Math.max(1, +e.target.value)))}
                className="w-full px-2 py-1 rounded-[6px] border border-border bg-sidebar text-sm text-foreground mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Year</label>
              <input
                type="number"
                min={2024} max={2035}
                value={year}
                onChange={(e) => setYear(+e.target.value)}
                className="w-full px-2 py-1 rounded-[6px] border border-border bg-sidebar text-sm text-foreground mt-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Hour</label>
              <input
                type="number"
                min={1} max={12}
                value={hours}
                onChange={(e) => setHours(Math.min(12, Math.max(1, +e.target.value)))}
                className="w-full px-2 py-1 rounded-[6px] border border-border bg-sidebar text-sm text-foreground mt-1"
              />
            </div>
            <span className="text-foreground mt-5">:</span>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Min</label>
              <input
                type="number"
                min={0} max={59}
                value={minutes}
                onChange={(e) => setMinutes(Math.min(59, Math.max(0, +e.target.value)))}
                className="w-full px-2 py-1 rounded-[6px] border border-border bg-sidebar text-sm text-foreground mt-1"
              />
            </div>
            <div className="mt-5 flex">
              <button
                type="button"
                onClick={() => setAmpm('AM')}
                className={`px-2 py-1 text-xs font-medium rounded-l-[6px] border border-r-0 border-border ${ampm === 'AM' ? 'bg-foreground text-background' : 'bg-sidebar text-foreground hover:bg-muted'}`}
              >AM</button>
              <button
                type="button"
                onClick={() => setAmpm('PM')}
                className={`px-2 py-1 text-xs font-medium rounded-r-[6px] border border-border ${ampm === 'PM' ? 'bg-foreground text-background' : 'bg-sidebar text-foreground hover:bg-muted'}`}
              >PM</button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={commit}
              className="flex-1 px-3 py-1.5 text-sm font-medium rounded-[6px] bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              Set Schedule
            </button>
            <button
              type="button"
              onClick={() => { setMode('none'); setShowPicker(false); }}
              className="px-3 py-1.5 text-sm rounded-[6px] border border-border bg-sidebar text-foreground hover:bg-muted transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

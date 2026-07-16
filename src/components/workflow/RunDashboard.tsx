import { useState, useMemo } from 'react';
import { useRunStore } from '@/stores/runStore';
import { HugeiconRenderer } from '@/components/ui/HugeiconRenderer';
import { Playlist02Icon, CheckmarkCircle03Icon, Activity01Icon } from '@hugeicons/core-free-icons';

function MiniDualBar({ active, inactive, total }: { active: number; inactive: number; total: number }) {
  const w = 72; const h = 12; const gap = 4;
  const activeW = total > 0 ? (active / total) * w : 0;
  const inactiveW = total > 0 ? (inactive / total) * w : 0;
  const fillRx = (fw: number) => Math.min(4, Math.max(fw, 2) / 2);
  return (
    <svg width={w} height={h * 2 + gap} viewBox={`0 0 ${w} ${h * 2 + gap}`} className="shrink-0">
      <rect x={0} y={0} width={w} height={h} rx={4} fill="#4ade80" opacity="0.12" />
      <rect x={0} y={0} width={Math.max(activeW, 2)} height={h} rx={fillRx(activeW)} fill="#4ade80" opacity="0.85">
        <title>Active: {active}</title>
      </rect>
      <rect x={0} y={h + gap} width={w} height={h} rx={4} fill="#818cf8" opacity="0.12" />
      <rect x={0} y={h + gap} width={Math.max(inactiveW, 2)} height={h} rx={fillRx(inactiveW)} fill="#818cf8" opacity="0.85">
        <title>Inactive: {inactive}</title>
      </rect>
    </svg>
  );
}

function MiniAreaChart({ data, color = '#60a5fa' }: { data: number[]; color?: string }) {
  const svg = useMemo(() => {
    if (data.length < 2) return null;
    const w = 56; const h = 28;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * w,
      y: h - ((v - min) / range) * (h - 6) - 3,
    }));

    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      d += ` C${(p1.x + (p2.x - p0.x) / 6)},${(p1.y + (p2.y - p0.y) / 6)} ${(p2.x - (p3.x - p1.x) / 6)},${(p2.y - (p3.y - p1.y) / 6)} ${p2.x},${p2.y}`;
    }

    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
        <path d={d + ` L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`} fill={`${color}18`} />
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2" fill={color} />
      </svg>
    );
  }, [data, color]);

  return svg;
}

function MiniDonut({ pct }: { pct: number }) {
  const size = 36;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * pct / 100;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="3" opacity="0.15" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="3"
        strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export function RunDashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const runs = useRunStore((s) => s.runs);

  const running = runs.filter((r) => r.status === 'running').length;
  const starting = runs.filter((r) => r.status === 'starting').length;
  const idle = runs.filter((r) => r.status === 'idle').length;
  const complete = runs.filter((r) => r.status === 'complete').length;
  const paused = runs.filter((r) => r.status === 'paused').length;
  const total = runs.length;

  const activeCount = running + starting;

  const successRate = total ? Math.round((complete / total) * 100) : 0;

  const now = new Date();
  const dayCounts: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    dayCounts.push(runs.filter((r) => r.createdAt >= d.getTime() && r.createdAt <= end.getTime()).length);
  }
  const todayCount = dayCounts[dayCounts.length - 1];

  const inactiveCount = idle + paused;
  const totalActive = activeCount + inactiveCount;

  const boxes = [
    {
      key: 'active',
      label: 'Active Runs',
      icon: Playlist02Icon,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
      count: activeCount,
      chart: <MiniDualBar active={activeCount} inactive={inactiveCount} total={totalActive} />,
      extra: `${activeCount} active · ${inactiveCount} inactive`,
    },
    {
      key: 'rate',
      label: 'Success Rate',
      icon: CheckmarkCircle03Icon,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      count: `${successRate}%`,
      chart: <MiniDonut pct={successRate} />,
      extra: `${complete} of ${total} runs completed`,
    },
    {
      key: 'today',
      label: 'Daily Activity',
      icon: Activity01Icon,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      count: todayCount,
      chart: <MiniAreaChart data={dayCounts} color="#60a5fa" />,
      extra: 'runs this week',
    },
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {boxes.map((box) => (
          <button
            key={box.key}
            onClick={() => setModalOpen(true)}
            className="flex flex-col items-start gap-1 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className={`p-1.5 rounded-lg ${box.bg}`}>
                <HugeiconRenderer icon={box.icon} size={16} className={box.color} />
              </div>
              {box.chart}
            </div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{box.label}</span>
            <span className="text-lg font-semibold text-foreground">{box.count}</span>
            {box.extra && (
              <span className="text-[10px] text-muted-foreground/60">{box.extra}</span>
            )}
          </button>
        ))}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[100] p-4 sm:p-6"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative bg-card rounded-2xl w-full max-w-[600px] h-[50vh] min-h-[300px] shadow-2xl shadow-black/50 border border-border"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

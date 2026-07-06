export function PageGradient() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[280px] pointer-events-none overflow-hidden z-0" aria-hidden="true">
      <div
        className="absolute bottom-0 -left-[5%] w-[60%] h-full rounded-full bg-violet-500/25 blur-[100px]"
        style={{ animation: 'aurora-drift-1 18s ease-in-out infinite' }}
      />
      <div
        className="absolute bottom-0 left-[15%] w-[70%] h-full rounded-full bg-amber-400/20 blur-[80px]"
        style={{ animation: 'aurora-drift-2 22s ease-in-out infinite' }}
      />
      <div
        className="absolute bottom-0 -right-[5%] w-[60%] h-full rounded-full bg-emerald-500/25 blur-[100px]"
        style={{ animation: 'aurora-drift-3 20s ease-in-out infinite' }}
      />
    </div>
  );
}

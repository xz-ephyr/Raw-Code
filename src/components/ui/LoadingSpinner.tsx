const outerIndices = new Set([1, 2, 4, 7, 8, 11, 13, 14]);
const cornerIndices = new Set([0, 3, 12, 15]);

const squares = Array.from({ length: 16 }, (_, i) => ({
  x: (i % 4) * 4,
  y: Math.floor(i / 4) * 4,
  delay: Math.random() * 1.5,
  duration: 1 + Math.random() * 1,
  outer: outerIndices.has(i),
  corner: cornerIndices.has(i),
}));

export function LoadingSpinner({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 15 15"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      <style>{`
        @keyframes pulse-opacity {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes pulse-opacity-dim {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.35; }
        }
      `}</style>
      {squares.map((sq, i) => (
        <rect
          key={i}
          x={sq.x}
          y={sq.y}
          width="3"
          height="3"
          rx="1"
          style={{
            opacity: sq.corner ? 0 : undefined,
            animation: sq.corner
              ? undefined
              : `${sq.outer ? 'pulse-opacity-dim' : 'pulse-opacity'} ${sq.duration}s ease-in-out infinite`,
            animationDelay: sq.corner ? undefined : `${sq.delay}s`,
            animationFillMode: sq.corner ? undefined : 'both',
          }}
        />
      ))}
    </svg>
  );
}

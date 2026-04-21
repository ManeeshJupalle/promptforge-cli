// Tiny SVG sparkline. Green squares = pass, orange = fail, grey = no data.
// Day-6 polish can turn this into a hover-interactive component with the
// run ID on tooltip — for Day 5 it's a dense status strip.
interface Point {
  passed: number;
}

export function Sparkline({ history, width = 120, height = 18 }: { history: Point[]; width?: number; height?: number }) {
  if (history.length === 0) {
    return (
      <span className="inline-block rounded border border-dashed border-[color:var(--color-border)] px-2 py-0.5 text-[10px] text-[color:var(--color-text-muted)]">
        no history
      </span>
    );
  }
  const barW = width / Math.max(history.length, 1);
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={`pass/fail history: ${history.map((h) => (h.passed ? 'P' : 'F')).join('')}`}
    >
      {history.map((h, i) => (
        <rect
          key={i}
          x={i * barW}
          y={1}
          width={Math.max(barW - 1, 1)}
          height={height - 2}
          fill={h.passed ? 'var(--color-pass)' : 'var(--color-fail)'}
          opacity={h.passed ? 0.85 : 0.95}
        />
      ))}
    </svg>
  );
}

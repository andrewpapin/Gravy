interface SparklinePoint {
  value: number;
  /** Rendered as a highlighted dot on the line — e.g. a rank-up day. */
  highlight?: boolean;
}

interface SparklineProps {
  points: SparklinePoint[];
  height?: number;
  className?: string;
  ariaLabel: string;
}

/** Minimal hand-rolled SVG line chart — no charting library in this app's dependency tree. */
export function Sparkline({ points, height = 64, className, ariaLabel }: SparklineProps) {
  const width = 300;
  if (points.length < 2) {
    return <div className={`sparkline sparkline-empty ${className ?? ''}`} role="img" aria-label={ariaLabel} />;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const toY = (v: number) => height - ((v - min) / range) * (height - 8) - 4;

  const coords = points.map((p, i) => [i * stepX, toY(p.value)] as const);
  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg
      className={`sparkline ${className ?? ''}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      <path className="sparkline-area" d={areaPath} />
      <path className="sparkline-line" d={path} fill="none" />
      {coords.map(([x, y], i) => points[i].highlight && (
        <circle key={i} className="sparkline-highlight" cx={x} cy={y} r={4} />
      ))}
    </svg>
  );
}

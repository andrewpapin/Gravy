import { AppIcon } from '../AppIcon';

export interface BarChartRow {
  key: string;
  label: string;
  value: number;
  icon?: string;
  valueLabel?: string;
}

interface BarChartProps {
  rows: BarChartRow[];
  /** Defaults to the largest row's value — pass explicitly to compare against a fixed scale. */
  maxValue?: number;
  className?: string;
}

/** Reuses the app's existing track/fill bar shape (see .rank-row-bar-track / .xp-bar-track in
 * index.css) instead of inventing new markup. */
export function BarChart({ rows, maxValue, className }: BarChartProps) {
  const scale = maxValue ?? Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className={`bar-chart ${className ?? ''}`}>
      {rows.map((row) => (
        <div className="bar-chart-row" key={row.key}>
          {row.icon && (
            <div className="bar-chart-row-icon-circle">
              <AppIcon iconKey={row.icon} className="bar-chart-row-icon" />
            </div>
          )}
          <div className="bar-chart-row-info">
            <div className="bar-chart-row-label-row">
              <span className="bar-chart-row-label">{row.label}</span>
              <span className="bar-chart-row-value">{row.valueLabel ?? row.value}</span>
            </div>
            <div className="rank-row-bar-track">
              <div
                className="rank-row-bar-fill"
                style={{ width: `${Math.min(100, Math.max(0, Math.round((row.value / scale) * 100)))}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

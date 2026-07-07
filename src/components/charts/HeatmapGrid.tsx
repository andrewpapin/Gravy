import type { HeatmapDay } from '../../state/statsSnapshot';

interface HeatmapGridProps {
  days: HeatmapDay[];
  ariaLabel: string;
}

function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
}

function formatCellDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** GitHub-contributions-style activity calendar — read-only, no date picking (unlike the
 * parent-only CalendarGrid, which is an editor). Squares carry no color literals; intensity
 * maps to `.heat-0`..`.heat-4` classes defined against theme CSS vars in index.css. */
export function HeatmapGrid({ days, ariaLabel }: HeatmapGridProps) {
  if (days.length === 0) return null;

  const leadingPad = weekdayOf(days[0].dateStr);
  const totalCells = leadingPad + days.length;
  const columns = Math.ceil(totalCells / 7);
  const grid: (HeatmapDay | null)[][] = Array.from({ length: columns }, () => Array(7).fill(null));
  days.forEach((day, i) => {
    const cellIndex = leadingPad + i;
    grid[Math.floor(cellIndex / 7)][cellIndex % 7] = day;
  });

  return (
    <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }} role="img" aria-label={ariaLabel}>
      {grid.map((col, colIdx) => (
        <div className="heatmap-col" key={colIdx}>
          {col.map((day, rowIdx) => (
            <div
              key={rowIdx}
              className={`heatmap-cell ${day ? `heat-${day.intensity}` : 'heatmap-cell-pad'}`}
              title={day ? `${formatCellDate(day.dateStr)}: ${day.hasLog ? `${day.points} pts` : 'no activity'}` : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

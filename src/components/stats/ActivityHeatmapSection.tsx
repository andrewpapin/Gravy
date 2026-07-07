import { HeatmapGrid } from '../charts/HeatmapGrid';
import { useStatsSnapshot } from '../../state/useStatsSnapshot';

export function ActivityHeatmapSection() {
  const { activityHeatmap } = useStatsSnapshot();
  const activeDays = activityHeatmap.filter((d) => d.hasLog).length;

  return (
    <section className="stats-section">
      <h3 className="stats-section-title">Activity Calendar</h3>
      {activeDays > 0 ? (
        <>
          <HeatmapGrid days={activityHeatmap} ariaLabel="Activity over the last 12 weeks" />
          <div className="heatmap-legend">
            <span>Less</span>
            <span className="heatmap-cell heat-0" />
            <span className="heatmap-cell heat-1" />
            <span className="heatmap-cell heat-2" />
            <span className="heatmap-cell heat-3" />
            <span className="heatmap-cell heat-4" />
            <span>More</span>
          </div>
          <p className="stats-section-caption">{activeDays} active days in the last 12 weeks</p>
        </>
      ) : (
        <p className="stats-section-empty">Log something today to start filling in your calendar!</p>
      )}
    </section>
  );
}

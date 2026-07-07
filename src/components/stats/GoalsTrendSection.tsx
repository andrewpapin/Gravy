import { Sparkline } from '../charts/Sparkline';
import { StatTile } from '../charts/StatTile';
import { useStatsSnapshot } from '../../state/useStatsSnapshot';

export function GoalsTrendSection() {
  const { goalsTrend } = useStatsSnapshot();
  const hasActivity = goalsTrend.days.some((d) => d.goalsCompleted > 0);

  return (
    <section className="stats-section">
      <h3 className="stats-section-title">Daily Goals Trend</h3>
      {hasActivity ? (
        <Sparkline
          points={goalsTrend.days.map((d) => ({ value: d.goalsCompleted }))}
          ariaLabel="Daily goals completed over the last 4 weeks"
          height={48}
        />
      ) : (
        <p className="stats-section-empty">Complete a daily goal to start your trend line!</p>
      )}
      <div className="stat-tile-grid">
        <StatTile icon="circleCheck" value={goalsTrend.allGoalsDays} label="All-Goals Days" />
        <StatTile icon="bullseye" value={goalsTrend.totalGoals} label="Goals Completed" />
      </div>
    </section>
  );
}

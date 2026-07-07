import { Sparkline } from '../charts/Sparkline';
import { useStatsSnapshot } from '../../state/useStatsSnapshot';

export function PointsHistorySection() {
  const { pointsHistory } = useStatsSnapshot();
  const earnedInWindow = pointsHistory.reduce((sum, d) => sum + Math.max(0, d.points), 0);
  const rankUps = pointsHistory.filter((d) => d.rankUp).length;

  return (
    <section className="stats-section">
      <h3 className="stats-section-title">Points Journey</h3>
      {earnedInWindow > 0 ? (
        <>
          <Sparkline
            points={pointsHistory.map((d) => ({ value: d.cumulativeTotal, highlight: d.rankUp }))}
            ariaLabel="Total points over the last 12 weeks"
          />
          <p className="stats-section-caption">
            {earnedInWindow} pts earned in the last 12 weeks
            {rankUps > 0 && ` — ranked up ${rankUps} time${rankUps === 1 ? '' : 's'}!`}
          </p>
        </>
      ) : (
        <p className="stats-section-empty">Start logging food and goals to watch your points grow!</p>
      )}
    </section>
  );
}

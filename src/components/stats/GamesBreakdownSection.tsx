import { BarChart } from '../charts/BarChart';
import { StatTile } from '../charts/StatTile';
import { useStatsSnapshot } from '../../state/useStatsSnapshot';

export function GamesBreakdownSection() {
  const { gamesBreakdown } = useStatsSnapshot();

  return (
    <section className="stats-section">
      <h3 className="stats-section-title">Games &amp; Play</h3>
      <div className="stat-tile-grid">
        <StatTile icon="gamepad" value={gamesBreakdown.gamesPlayed} label="Games Played" />
        <StatTile icon="trophy" value={gamesBreakdown.gamesWon} label="Games Won" />
        <StatTile icon="bolt" value={`${Math.round(gamesBreakdown.winRate * 100)}%`} label="Win Rate" />
      </div>
      {gamesBreakdown.recentByGame.length > 0 && (
        <>
          <BarChart
            className="games-breakdown-bar-chart"
            rows={gamesBreakdown.recentByGame.map((g) => ({
              key: g.id,
              label: g.name,
              value: g.recentWins,
              icon: g.icon,
              valueLabel: `${g.recentWins} win${g.recentWins === 1 ? '' : 's'}`,
            }))}
          />
          {gamesBreakdown.isRecentWindowTruncated && (
            <p className="stats-section-caption">Showing recent activity only</p>
          )}
        </>
      )}
    </section>
  );
}

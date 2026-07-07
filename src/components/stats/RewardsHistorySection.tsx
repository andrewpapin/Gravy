import { AppIcon } from '../AppIcon';
import { useStatsSnapshot } from '../../state/useStatsSnapshot';
import { formatFriendlyDate } from '../../state/defaultState';

export function RewardsHistorySection() {
  const { rewardsHistory } = useStatsSnapshot();

  return (
    <section className="stats-section">
      <h3 className="stats-section-title">Rewards Redeemed</h3>
      {rewardsHistory.length > 0 ? (
        <ul className="rewards-history-list">
          {rewardsHistory.map((r) => (
            <li className="rewards-history-row" key={r.id}>
              <div className="rewards-history-row-icon-circle">
                <AppIcon iconKey="gift" className="rewards-history-row-icon" />
              </div>
              <div className="rewards-history-row-info">
                <span className="rewards-history-row-label">{r.label}</span>
                <span className="rewards-history-row-date">{formatFriendlyDate(r.dateStr)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="stats-section-empty">Redeem a reward to see it here!</p>
      )}
    </section>
  );
}

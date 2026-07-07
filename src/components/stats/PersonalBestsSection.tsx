import { StatTile } from '../charts/StatTile';
import { useStatsSnapshot } from '../../state/useStatsSnapshot';
import { formatFriendlyDate } from '../../state/defaultState';

export function PersonalBestsSection() {
  const { personalBests } = useStatsSnapshot();
  const { longestStreakEver } = personalBests;

  return (
    <section className="stats-section">
      <h3 className="stats-section-title">Personal Bests</h3>
      <div className="stat-tile-grid">
        <StatTile icon="trophy" value={`${personalBests.bestDayPoints} pts`} label="Best Day Ever" />
        <StatTile icon="utensils" value={personalBests.fullTrayDays} label="Full Tray Days" />
        <StatTile icon="star" value={personalBests.comboDays} label="Combo Days" />
      </div>
      {personalBests.bestDayDateStr && (
        <p className="stats-section-caption">Set on {formatFriendlyDate(personalBests.bestDayDateStr)}</p>
      )}
      <h4 className="stats-section-subtitle">Longest Streaks Ever</h4>
      <div className="stat-tile-grid">
        <StatTile icon="fire" value={longestStreakEver.streak} label="Day Streak" />
        <StatTile icon="utensils" value={longestStreakEver.foodStreak} label="Food Streak" />
        <StatTile icon="bullseye" value={longestStreakEver.goalStreak} label="Goal Streak" />
        <StatTile icon="crown" value={longestStreakEver.megaStreak} label="Mega Streak" />
      </div>
    </section>
  );
}

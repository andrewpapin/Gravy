import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFire, faUtensils, faListCheck, faStar, faMedal, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { getRank, RANKS } from '../data/ranks';
import { FOODS } from '../data/foods';
import { AppIcon } from './AppIcon';
import { useGravy } from '../state/GravyContext';
import { getEnabledBadgeCount } from '../state/badges';

interface StatsCardProps {
  onOpenBadges: () => void;
}

export function StatsCard({ onOpenBadges }: StatsCardProps) {
  const { state } = useGravy();
  const { rank, index } = getRank(state.totalPoints);
  const earnedCount = state.earnedBadges.length;
  const totalBadgeCount = getEnabledBadgeCount(state);
  const hasLoggedToday =
    Object.keys(state.todayFoodCounts).length > 0 ||
    state.todayGoals.length > 0 ||
    state.todayPoints > 0 ||
    Object.values(state.todayGoalCounts || {}).some((c) => c > 0);
  const streakAtRisk = state.streak > 0 && !hasLoggedToday;

  // At-a-glance "today" snapshot, tying the food + goal cards back into the rank banner.
  const eatenCount = Object.values(state.todayFoodCounts).filter((v) => v > 0).length;
  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  const goalCounts = state.todayGoalCounts || {};
  const goalsDone = dailyGoals.filter((g) => (goalCounts[g.id] || 0) >= (g.target || 1)).length;
  const foodDone = eatenCount === FOODS.length;
  const goalsAllDone = dailyGoals.length > 0 && goalsDone === dailyGoals.length;

  let xpText: string;
  let pct: number;
  if (index < RANKS.length - 1) {
    const next = RANKS[index + 1];
    const progress = state.totalPoints - rank.min;
    const needed = next.min - rank.min;
    pct = Math.min(100, Math.round((progress / needed) * 100));
    xpText = `${state.totalPoints - rank.min} / ${needed} pts to next rank`;
  } else {
    pct = 100;
    xpText = 'MAX RANK! 👑';
  }

  return (
    <div className="stats-card">
      <div className="stats-rank">
        <div className="stats-rank-top">
          <AppIcon iconKey={rank.icon} emojiFallback={rank.emoji} className="stats-rank-emoji" />
          <span className="stats-rank-name">{rank.name}</span>
        </div>
        <div className="stats-rank-xp">{xpText}</div>
        <div className="xp-bar-track">
          <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="stats-today" aria-label={`Food streak ${state.foodStreak}, goal streak ${state.goalStreak}, streak ${state.streak}, mega streak ${state.megaStreak}`}>
          <span className={`stats-today-chip ${foodDone ? 'done' : ''}`} title="Food streak">
            <FontAwesomeIcon icon={faUtensils} aria-hidden="true" /> {state.foodStreak}
          </span>
          {dailyGoals.length > 0 && (
            <span className={`stats-today-chip ${goalsAllDone ? 'done' : ''}`} title="Goal streak">
              <FontAwesomeIcon icon={faListCheck} aria-hidden="true" /> {state.goalStreak}
            </span>
          )}
          {state.streak > 0 && (
            <span
              className={`stats-today-chip streak-badge${streakAtRisk ? ' streak-badge--risk' : ''}`}
              title={streakAtRisk ? `Log something today to keep your ${state.streak}-day streak!` : `${state.streak} day streak`}
            >
              <FontAwesomeIcon icon={faFire} /> {state.streak}
            </span>
          )}
          <span className="stats-today-chip" title="Mega streak">
            <FontAwesomeIcon icon={faStar} aria-hidden="true" /> {state.megaStreak}
          </span>
        </div>
        {streakAtRisk && (
          <div className="streak-risk-nudge">
            <FontAwesomeIcon icon={faFire} /> Log something today to keep your streak going!
          </div>
        )}
      </div>
      <button className="stats-badges-bar" onClick={onOpenBadges} type="button">
        <span className="stats-badges-bar-label">
          <FontAwesomeIcon icon={faMedal} /> {earnedCount}/{totalBadgeCount} Badges
        </span>
        <FontAwesomeIcon icon={faChevronRight} />
      </button>
    </div>
  );
}

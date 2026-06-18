import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFire, faUtensils, faListCheck } from '@fortawesome/free-solid-svg-icons';
import { getRank, RANKS } from '../data/ranks';
import { FOODS } from '../data/foods';
import { AppIcon } from './AppIcon';
import { useGrubClub } from '../state/GrubClubContext';

export function StatsCard() {
  const { state } = useGrubClub();
  const { rank, index } = getRank(state.totalPoints);
  const hasLoggedToday =
    Object.keys(state.todayFoodCounts).length > 0 || state.todayGoals.length > 0 || state.todayPoints > 0;
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
          {state.streak > 0 && (
            <span
              className={`streak-badge${streakAtRisk ? ' streak-badge--risk' : ''}`}
              title={streakAtRisk ? `Log something today to keep your ${state.streak}-day streak!` : `${state.streak} day streak`}
            >
              <FontAwesomeIcon icon={faFire} /> {state.streak}
            </span>
          )}
        </div>
        <div className="stats-rank-xp">{xpText}</div>
        <div className="xp-bar-track">
          <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="stats-today" aria-label={`Today: ${eatenCount} of ${FOODS.length} foods, ${goalsDone} of ${dailyGoals.length} goals`}>
          <span className={`stats-today-chip ${foodDone ? 'done' : ''}`}>
            <FontAwesomeIcon icon={faUtensils} aria-hidden="true" /> {eatenCount}/{FOODS.length}
          </span>
          {dailyGoals.length > 0 && (
            <span className={`stats-today-chip ${goalsAllDone ? 'done' : ''}`}>
              <FontAwesomeIcon icon={faListCheck} aria-hidden="true" /> {goalsDone}/{dailyGoals.length}
            </span>
          )}
        </div>
        {streakAtRisk && (
          <div className="streak-risk-nudge">
            <FontAwesomeIcon icon={faFire} /> Log something today to keep your streak going!
          </div>
        )}
      </div>
    </div>
  );
}

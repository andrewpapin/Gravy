import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFire, faStar } from '@fortawesome/free-solid-svg-icons';
import { getRank, RANKS } from '../data/ranks';
import { useGrubClub } from '../state/GrubClubContext';

export function StatsCard() {
  const { state } = useGrubClub();
  const { rank, index } = getRank(state.totalPoints);

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
          <span className="stats-rank-emoji">{rank.emoji}</span>
          <span className="stats-rank-name">{rank.name}</span>
        </div>
        <div className="stats-rank-xp">{xpText}</div>
        <div className="xp-bar-track">
          <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="stats-bottom">
        <div className="stats-streak">
          <div className="stats-streak-top">
            <span className="stats-streak-fire"><FontAwesomeIcon icon={faFire} /></span>
            <span className="stats-streak-num">{state.streak}</span>
          </div>
          <div className="stats-streak-label">Day Streak</div>
        </div>
        <div className="stats-points">
          <div className="stats-points-top">
            <span className="stats-points-star"><FontAwesomeIcon icon={faStar} /></span>
            <span className="stats-points-num">{state.todayPoints}</span>
          </div>
          <div className="stats-points-label">Today's Points</div>
        </div>
      </div>
    </div>
  );
}

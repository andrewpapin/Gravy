import { getRank, RANKS } from '../data/ranks';
import { useGrubClub } from '../state/GrubClubContext';

export function RankBanner() {
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
    <div className="rank-banner">
      <span className="rank-emoji">{rank.emoji}</span>
      <div className="rank-label">Current Rank</div>
      <div className="rank-name">{rank.name}</div>
      <div className="rank-xp">
        <span>{xpText}</span>
      </div>
      <div className="xp-bar-track">
        <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

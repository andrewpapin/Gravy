import { useGrubClub } from '../state/GrubClubContext';

export function StreakCard() {
  const { state } = useGrubClub();
  return (
    <div className="streak-card">
      <div className="streak-fire">🔥</div>
      <div>
        <div className="streak-num">{state.streak}</div>
        <div className="streak-label">Day Streak</div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.85 }}>Today's Points</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{state.todayPoints}</div>
      </div>
    </div>
  );
}

import { TopBar } from './TopBar';
import { getBadgeDisplay, getEnabledBadges } from '../state/badges';
import { useGrubClub } from '../state/GrubClubContext';

interface BadgesScreenProps {
  onShowBadge: (id: string) => void;
}

export function BadgesScreen({ onShowBadge }: BadgesScreenProps) {
  const { state } = useGrubClub();
  const visible = getEnabledBadges(state);

  return (
    <div className="screen active">
      <TopBar logo="🏅" title="My Badges" />
      <div className="scroll-area">
        {visible.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <span className="empty-state-emoji">😴</span>
            <div className="empty-state-text">
              No badges enabled yet.
              <br />
              Ask a grown-up to turn some on!
            </div>
          </div>
        ) : (
          <div className="badges-grid">
            {visible.map((b) => {
              const display = getBadgeDisplay(state, b.id);
              if (!display) return null;
              const earned = state.earnedBadges.includes(b.id);
              return (
                <div key={b.id} className={`badge-tile ${earned ? 'unlocked' : 'locked'}`}>
                  <button className="badge-info-btn" onClick={() => onShowBadge(b.id)}>
                    ?
                  </button>
                  <span className="badge-icon">{display.emoji}</span>
                  <div className="badge-name">{display.name}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

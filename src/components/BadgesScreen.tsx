import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon } from '@fortawesome/free-solid-svg-icons';
import { TopBar } from './TopBar';
import { getBadgeDisplay, getBadgeProgress, getEnabledBadges } from '../state/badges';
import { useGrubClub } from '../state/GrubClubContext';

interface BadgesScreenProps {
  onShowBadge: (id: string) => void;
  onEnterParent: () => void;
  onOpenStore: () => void;
}

export function BadgesScreen({ onShowBadge, onEnterParent: _onEnterParent, onOpenStore }: BadgesScreenProps) {
  const { state } = useGrubClub();
  const visible = getEnabledBadges(state);

  return (
    <div className="screen active">
      <TopBar title="My Badges" onTapPoints={onOpenStore} />
      <div className="scroll-area">
        {visible.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <span className="empty-state-emoji"><FontAwesomeIcon icon={faMoon} /></span>
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
              const progress = getBadgeProgress(state, b);
              return (
                <div key={b.id} className={`badge-tile ${earned ? 'unlocked' : 'locked'}`}>
                  <button className="badge-info-btn" onClick={() => onShowBadge(b.id)} aria-label={`Info about ${display.name} badge`} type="button">
                    ?
                  </button>
                  <span className="badge-icon">{display.emoji}</span>
                  <div className="badge-name">{display.name}</div>
                  {progress && !earned && (
                    <>
                      <div className="badge-progress">
                        <div
                          className="badge-progress-fill"
                          style={{ width: `${Math.min(100, (progress.current / progress.target) * 100)}%` }}
                        />
                      </div>
                      <div className="badge-progress-label">
                        {Math.min(progress.current, progress.target)}/{progress.target}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

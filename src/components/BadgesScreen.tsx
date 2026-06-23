import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon } from '@fortawesome/free-solid-svg-icons';
import { AppIcon } from './AppIcon';
import { Modal } from './Modal';
import { getBadgeDisplay, getBadgeProgress, getEnabledBadges } from '../state/badges';
import { useGravy } from '../state/GravyContext';

interface BadgesScreenProps {
  open: boolean;
  onClose: () => void;
  onShowBadge: (id: string) => void;
}

export function BadgesScreen({ open, onClose, onShowBadge }: BadgesScreenProps) {
  const { state } = useGravy();
  const visible = getEnabledBadges(state);

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="Close badges"
      title={<span className="calendar-modal-title">My Badges</span>}
    >
      {visible.length === 0 ? (
        <div className="empty-state empty-state--bare" style={{ gridColumn: '1 / -1' }}>
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
                <AppIcon iconKey={display.icon} emojiFallback={display.emoji} className="badge-icon" />
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
    </Modal>
  );
}

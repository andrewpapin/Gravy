import { BADGE_MASTER } from '../data/badges';
import { getBadgeDisplay } from '../state/badges';
import { useGrubClub } from '../state/GrubClubContext';

interface BadgePopupProps {
  badgeId: string | null;
  onClose: () => void;
}

export function BadgePopup({ badgeId, onClose }: BadgePopupProps) {
  const { state } = useGrubClub();
  const master = badgeId ? BADGE_MASTER.find((b) => b.id === badgeId) : null;
  const display = badgeId ? getBadgeDisplay(state, badgeId) : null;
  const earned = badgeId ? state.earnedBadges.includes(badgeId) : false;

  return (
    <div
      className={`badge-popup-overlay ${master ? 'show' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {master && display && (
        <div className="badge-popup">
          <button className="badge-popup-close" onClick={onClose}>
            ✕
          </button>
          <span className="badge-popup-icon">{display.emoji}</span>
          <div className="badge-popup-name">{display.name}</div>
          <div className="badge-popup-desc">{master.desc}</div>
          <span className={`badge-popup-status ${earned ? 'earned' : 'locked'}`}>
            {earned ? '✓ Unlocked!' : '🔒 Not yet earned'}
          </span>
        </div>
      )}
    </div>
  );
}

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faLock, faCheck } from '@fortawesome/free-solid-svg-icons';
import { BADGE_MASTER } from '../data/badges';
import { AppIcon } from './AppIcon';
import { getBadgeDisplay } from '../state/badges';
import { useGravy } from '../state/GravyContext';
import { useFocusTrap } from './useFocusTrap';

interface BadgePopupProps {
  badgeId: string | null;
  onClose: () => void;
}

export function BadgePopup({ badgeId, onClose }: BadgePopupProps) {
  const { state } = useGravy();
  const master = badgeId ? BADGE_MASTER.find((b) => b.id === badgeId) : null;
  const display = badgeId ? getBadgeDisplay(state, badgeId) : null;
  const earned = badgeId ? state.earnedBadges.includes(badgeId) : false;
  const popupRef = useFocusTrap<HTMLDivElement>(Boolean(master && display), onClose);

  return (
    <div
      className={`badge-popup-overlay ${master ? 'show' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {master && display && (
        <div className="badge-popup" ref={popupRef} role="dialog" aria-modal="true" aria-label={display.name} tabIndex={-1}>
          <button className="badge-popup-close" onClick={onClose} aria-label="Close badge details" type="button">
            <FontAwesomeIcon icon={faXmark} />
          </button>
          <AppIcon iconKey={display.icon} emojiFallback={display.emoji} className="badge-popup-icon" />
          <div className="badge-popup-name">{display.name}</div>
          <div className="badge-popup-desc">{master.desc}</div>
          <span className={`badge-popup-status ${earned ? 'earned' : 'locked'}`}>
            {earned ? <><FontAwesomeIcon icon={faCheck} /> Unlocked!</> : <><FontAwesomeIcon icon={faLock} /> Not yet earned</>}
          </span>
        </div>
      )}
    </div>
  );
}

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faLock, faGift, faRightLeft, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';

interface AccountMenuProps {
  open: boolean;
  onClose: () => void;
  onOpenStore: () => void;
  onOpenSettings: () => void;
  onOpenGrownUps: () => void;
  onOpenSwitchProfile: () => void;
  onOpenProfiles: () => void;
}

export function AccountMenu({
  open,
  onClose,
  onOpenStore,
  onOpenSettings,
  onOpenGrownUps,
  onOpenSwitchProfile,
  onOpenProfiles,
}: AccountMenuProps) {
  const { state, profiles } = useGravy();
  const pendingCount = state.pendingRewards.length;

  return (
    <div
      className={`badge-popup-overlay ${open ? 'show' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {open && (
        <div className="badge-popup account-menu">
          <button type="button" className="account-menu-option" onClick={onOpenStore}>
            <span
              className="account-menu-option-icon nav-badge"
              data-count={pendingCount}
              title={pendingCount > 0 ? `${pendingCount} request${pendingCount === 1 ? '' : 's'} waiting for approval` : undefined}
            >
              <FontAwesomeIcon icon={faGift} />
            </span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Reward Store</span>
              <span className="account-menu-option-sub">Spend your points</span>
            </span>
          </button>
          {profiles.length > 1 && (
            <button type="button" className="account-menu-option" onClick={onOpenSwitchProfile}>
              <span className="account-menu-option-icon"><FontAwesomeIcon icon={faRightLeft} /></span>
              <span className="account-menu-option-text">
                <span className="account-menu-option-title">Switch Profile</span>
                <span className="account-menu-option-sub">Enter PIN</span>
              </span>
            </button>
          )}
          <button type="button" className="account-menu-option" onClick={onOpenSettings}>
            <span className="account-menu-option-icon"><FontAwesomeIcon icon={faGear} /></span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Settings</span>
              <span className="account-menu-option-sub">No PIN needed</span>
            </span>
          </button>
          <button type="button" className="account-menu-option" onClick={onOpenGrownUps}>
            <span className="account-menu-option-icon"><FontAwesomeIcon icon={faLock} /></span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Grown ups</span>
              <span className="account-menu-option-sub">Enter PIN</span>
            </span>
          </button>
          <button type="button" className="account-menu-option" onClick={onOpenProfiles}>
            <span className="account-menu-option-icon"><FontAwesomeIcon icon={faUsers} /></span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Profiles</span>
              <span className="account-menu-option-sub">Enter PIN</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

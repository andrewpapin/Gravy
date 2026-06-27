import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faLockOpen, faGift, faRightLeft, faUsers, faUserShield, faGear, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import { useFocusTrap } from './useFocusTrap';
import { PinScreen } from './PinScreen';
import { APP_VERSION } from '../version';

type Stage = 'menu' | 'pin';

interface AccountMenuProps {
  open: boolean;
  onClose: () => void;
  onOpenStore: () => void;
  onOpenGrownUps: () => void;
  onOpenSwitchProfile: () => void;
  onOpenProfiles: () => void;
  onOpenSettings: () => void;
  onOpenLog: () => void;
}

export function AccountMenu({
  open,
  onClose,
  onOpenStore,
  onOpenGrownUps,
  onOpenSwitchProfile,
  onOpenProfiles,
  onOpenSettings,
  onOpenLog,
}: AccountMenuProps) {
  const { state, profiles, grownUpUnlocked, unlockGrownUpAccess, lockGrownUpAccess } = useGravy();
  const pendingCount = state.pendingRewards.length;
  const menuRef = useFocusTrap<HTMLDivElement>(open, onClose);
  const [stage, setStage] = useState<Stage>('menu');
  // Re-prompt the PIN on every fresh open, adjusted during render (not an effect) — this
  // component never unmounts (only its inner JSX is conditionally rendered below), so a
  // half-finished PIN attempt would otherwise linger across opens/closes.
  const [prevOpen, setPrevOpen] = useState(open);
  const [pinNonce, setPinNonce] = useState(0);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStage('menu');
      setPinNonce((n) => n + 1);
    }
  }

  return (
    <div
      className={`badge-popup-overlay ${open ? 'show' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {open && (
        <div className="badge-popup account-menu" ref={menuRef} role="dialog" aria-modal="true" aria-label="Account menu" tabIndex={-1}>
          {stage === 'pin' ? (
            <>
              <PinScreen key={pinNonce} onSuccess={() => { unlockGrownUpAccess(); setStage('menu'); }} />
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setStage('menu')}
                style={{ marginTop: 8 }}
              >
                ← Back
              </button>
            </>
          ) : (
            <>
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
              <button
                type="button"
                className="account-menu-option"
                onClick={() => (grownUpUnlocked ? lockGrownUpAccess() : setStage('pin'))}
              >
                <span className="account-menu-option-icon"><FontAwesomeIcon icon={grownUpUnlocked ? faLockOpen : faLock} /></span>
                <span className="account-menu-option-text">
                  <span className="account-menu-option-title">Grown-Up Access</span>
                  <span className="account-menu-option-sub">
                    {grownUpUnlocked ? 'Unlocked for this session — tap to lock' : 'Locked — tap to unlock'}
                  </span>
                </span>
              </button>
              {profiles.length > 1 && (
                <button type="button" className="account-menu-option" disabled={!grownUpUnlocked} onClick={onOpenSwitchProfile}>
                  <span className="account-menu-option-icon"><FontAwesomeIcon icon={faRightLeft} /></span>
                  <span className="account-menu-option-text">
                    <span className="account-menu-option-title">Switch Profile</span>
                    <span className="account-menu-option-sub">Pick another kid</span>
                  </span>
                </button>
              )}
              <button type="button" className="account-menu-option" disabled={!grownUpUnlocked} onClick={onOpenGrownUps}>
                <span className="account-menu-option-icon"><FontAwesomeIcon icon={faUserShield} /></span>
                <span className="account-menu-option-text">
                  <span className="account-menu-option-title">Grown ups</span>
                  <span className="account-menu-option-sub">Parent dashboard</span>
                </span>
              </button>
              <button type="button" className="account-menu-option" disabled={!grownUpUnlocked} onClick={onOpenLog}>
                <span className="account-menu-option-icon"><FontAwesomeIcon icon={faClockRotateLeft} /></span>
                <span className="account-menu-option-text">
                  <span className="account-menu-option-title">Log</span>
                  <span className="account-menu-option-sub">History of every action</span>
                </span>
              </button>
              <button type="button" className="account-menu-option" disabled={!grownUpUnlocked} onClick={onOpenProfiles}>
                <span className="account-menu-option-icon"><FontAwesomeIcon icon={faUsers} /></span>
                <span className="account-menu-option-text">
                  <span className="account-menu-option-title">Profiles</span>
                  <span className="account-menu-option-sub">Manage kids</span>
                </span>
              </button>
              <button type="button" className="account-menu-option" disabled={!grownUpUnlocked} onClick={onOpenSettings}>
                <span className="account-menu-option-icon"><FontAwesomeIcon icon={faGear} /></span>
                <span className="account-menu-option-text">
                  <span className="account-menu-option-title">Advanced Settings</span>
                  <span className="account-menu-option-sub">PIN, time zone, cloud sync, and reset</span>
                </span>
              </button>
              <div className="account-menu-version">v{APP_VERSION}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

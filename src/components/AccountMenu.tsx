import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLockOpen, faRightLeft, faUsers, faUserShield, faGear, faClockRotateLeft, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import { Modal } from './Modal';
import { PinScreen } from './PinScreen';
import { APP_VERSION } from '../version';

interface AccountMenuProps {
  open: boolean;
  onClose: () => void;
  onOpenGrownUps: () => void;
  onOpenSwitchProfile: () => void;
  onOpenProfiles: () => void;
  onOpenSettings: () => void;
  onOpenLog: () => void;
  onOpenCalendar: () => void;
}

export function AccountMenu({
  open,
  onClose,
  onOpenGrownUps,
  onOpenSwitchProfile,
  onOpenProfiles,
  onOpenSettings,
  onOpenLog,
  onOpenCalendar,
}: AccountMenuProps) {
  const { profiles, grownUpUnlocked, unlockGrownUpAccess, lockGrownUpAccess } = useGravy();
  // Re-prompt the PIN on every fresh open, adjusted during render (not an effect) — this
  // component never unmounts (only its inner JSX is conditionally rendered below), so a
  // half-finished PIN attempt would otherwise linger across opens/closes.
  const [prevOpen, setPrevOpen] = useState(open);
  const [pinNonce, setPinNonce] = useState(0);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setPinNonce((n) => n + 1);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="Close grown-up menu"
      title={grownUpUnlocked ? 'Grown-Up Menu' : 'Grown-Up Access'}
    >
      {grownUpUnlocked ? (
        <div className="account-menu">
          <button type="button" className="account-menu-option" onClick={() => { lockGrownUpAccess(); onClose(); }}>
            <span className="account-menu-option-icon"><FontAwesomeIcon icon={faLockOpen} /></span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Lock</span>
              <span className="account-menu-option-sub">Unlocked for this session — tap to lock</span>
            </span>
          </button>
          {profiles.length > 1 && (
            <button type="button" className="account-menu-option" onClick={onOpenSwitchProfile}>
              <span className="account-menu-option-icon"><FontAwesomeIcon icon={faRightLeft} /></span>
              <span className="account-menu-option-text">
                <span className="account-menu-option-title">Switch Profile</span>
                <span className="account-menu-option-sub">Pick another kid</span>
              </span>
            </button>
          )}
          <button type="button" className="account-menu-option" onClick={onOpenGrownUps}>
            <span className="account-menu-option-icon"><FontAwesomeIcon icon={faUserShield} /></span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Grown ups</span>
              <span className="account-menu-option-sub">Parent dashboard</span>
            </span>
          </button>
          <button type="button" className="account-menu-option" onClick={onOpenCalendar}>
            <span className="account-menu-option-icon"><FontAwesomeIcon icon={faCalendarDays} /></span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Calendar</span>
              <span className="account-menu-option-sub">View and edit past days</span>
            </span>
          </button>
          <button type="button" className="account-menu-option" onClick={onOpenLog}>
            <span className="account-menu-option-icon"><FontAwesomeIcon icon={faClockRotateLeft} /></span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Log</span>
              <span className="account-menu-option-sub">History of every action, including admin changes</span>
            </span>
          </button>
          <button type="button" className="account-menu-option" onClick={onOpenProfiles}>
            <span className="account-menu-option-icon"><FontAwesomeIcon icon={faUsers} /></span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Profiles</span>
              <span className="account-menu-option-sub">Manage kids</span>
            </span>
          </button>
          <button type="button" className="account-menu-option" onClick={onOpenSettings}>
            <span className="account-menu-option-icon"><FontAwesomeIcon icon={faGear} /></span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Advanced Settings</span>
              <span className="account-menu-option-sub">PIN, time zone, cloud sync, and reset</span>
            </span>
          </button>
          <div className="account-menu-version">v{APP_VERSION}</div>
        </div>
      ) : (
        <PinScreen key={pinNonce} onSuccess={unlockGrownUpAccess} />
      )}
    </Modal>
  );
}

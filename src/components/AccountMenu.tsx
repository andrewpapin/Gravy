import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faLockOpen, faRightLeft, faUsers, faUserShield, faGear, faClockRotateLeft, faCalendarDays, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
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
  onOpenApprovals: () => void;
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
  onOpenApprovals,
}: AccountMenuProps) {
  const { state, profiles, grownUpUnlocked, unlockGrownUpAccess, lockGrownUpAccess } = useGravy();
  const pendingCount = state.pendingRewards.length;
  // Re-prompt the PIN on every fresh open, adjusted during render (not an effect) — this
  // component never unmounts (only its inner JSX is conditionally rendered below), so a
  // half-finished PIN attempt would otherwise linger across opens/closes.
  const [prevOpen, setPrevOpen] = useState(open);
  const [pinNonce, setPinNonce] = useState(0);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPinNonce((n) => n + 1);
      setPinPromptOpen(false);
    }
  }

  const locked = !grownUpUnlocked;
  const runIfUnlocked = (action: () => void) => () => { if (!locked) action(); };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="Close grown-up menu"
      title={pinPromptOpen ? 'Grown-Up Access' : 'Grown-Up Menu'}
      onBack={pinPromptOpen ? () => setPinPromptOpen(false) : undefined}
      headerExtra={
        <button
          type="button"
          className={`calendar-modal-lock ${locked ? '' : 'unlocked'}`}
          onClick={() => { if (locked) setPinPromptOpen(true); else lockGrownUpAccess(); }}
          aria-label={locked ? 'Unlock grown-up access' : 'Lock grown-up access'}
        >
          <FontAwesomeIcon icon={locked ? faLock : faLockOpen} />
        </button>
      }
    >
      {pinPromptOpen ? (
        <PinScreen key={pinNonce} onSuccess={() => { unlockGrownUpAccess(); setPinPromptOpen(false); }} />
      ) : (
        <div className="account-menu">
          <button type="button" className="account-menu-option" disabled={locked} onClick={runIfUnlocked(onOpenApprovals)}>
            <span className="account-menu-option-icon nav-badge" data-count={pendingCount}><FontAwesomeIcon icon={faCircleCheck} /></span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Approvals</span>
              <span className="account-menu-option-sub">
                {pendingCount > 0 ? `${pendingCount} request${pendingCount === 1 ? '' : 's'} waiting` : 'Reward requests to approve'}
              </span>
            </span>
          </button>
          {profiles.length > 1 && (
            <button type="button" className="account-menu-option" disabled={locked} onClick={runIfUnlocked(onOpenSwitchProfile)}>
              <span className="account-menu-option-icon"><FontAwesomeIcon icon={faRightLeft} /></span>
              <span className="account-menu-option-text">
                <span className="account-menu-option-title">Switch Profile</span>
                <span className="account-menu-option-sub">Pick another kid</span>
              </span>
            </button>
          )}
          <button type="button" className="account-menu-option" disabled={locked} onClick={runIfUnlocked(onOpenGrownUps)}>
            <span className="account-menu-option-icon"><FontAwesomeIcon icon={faUserShield} /></span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Game Settings</span>
              <span className="account-menu-option-sub">Goals, rewards, and badges</span>
            </span>
          </button>
          <button type="button" className="account-menu-option" disabled={locked} onClick={runIfUnlocked(onOpenCalendar)}>
            <span className="account-menu-option-icon"><FontAwesomeIcon icon={faCalendarDays} /></span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Calendar</span>
              <span className="account-menu-option-sub">View and edit past days</span>
            </span>
          </button>
          <button type="button" className="account-menu-option" disabled={locked} onClick={runIfUnlocked(onOpenLog)}>
            <span className="account-menu-option-icon"><FontAwesomeIcon icon={faClockRotateLeft} /></span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Log</span>
              <span className="account-menu-option-sub">History of every action, including admin changes</span>
            </span>
          </button>
          <button type="button" className="account-menu-option" disabled={locked} onClick={runIfUnlocked(onOpenProfiles)}>
            <span className="account-menu-option-icon"><FontAwesomeIcon icon={faUsers} /></span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Profiles</span>
              <span className="account-menu-option-sub">Manage kids</span>
            </span>
          </button>
          <button type="button" className="account-menu-option" disabled={locked} onClick={runIfUnlocked(onOpenSettings)}>
            <span className="account-menu-option-icon"><FontAwesomeIcon icon={faGear} /></span>
            <span className="account-menu-option-text">
              <span className="account-menu-option-title">Advanced Settings</span>
              <span className="account-menu-option-sub">PIN, time zone, cloud sync, and reset</span>
            </span>
          </button>
          <div className="account-menu-version">v{APP_VERSION}</div>
        </div>
      )}
    </Modal>
  );
}

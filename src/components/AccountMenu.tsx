import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightToBracket, faRightFromBracket, faRightLeft, faUsers, faUserShield, faGear, faClockRotateLeft, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import { Modal } from './Modal';
import { SignInPrompt } from './SignInPrompt';
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
  const { profiles, grownUpUnlocked, signOutAccount } = useGravy();
  // Re-prompt sign-in on every fresh open, adjusted during render (not an effect) — this
  // component never unmounts (only its inner JSX is conditionally rendered below), so a
  // half-finished sign-in attempt would otherwise linger across opens/closes.
  const [prevOpen, setPrevOpen] = useState(open);
  const [signInNonce, setSignInNonce] = useState(0);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSignInNonce((n) => n + 1);
      setSignInPromptOpen(false);
    }
  }

  const locked = !grownUpUnlocked;
  const runIfUnlocked = (action: () => void) => () => { if (!locked) action(); };
  // Once signing in (or joining) actually unlocks the device, the prompt should fall away back
  // to the item list on its own — grownUpUnlocked is derived, not something SignInPrompt sets
  // itself, so this is computed at render time rather than reset via an effect.
  const showSignInPrompt = signInPromptOpen && locked;

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="Close grown-up menu"
      title={showSignInPrompt ? 'Sign In' : 'Grown-Up Menu'}
      onBack={showSignInPrompt ? () => setSignInPromptOpen(false) : undefined}
      headerExtra={
        <button
          type="button"
          className={`calendar-modal-lock ${locked ? '' : 'unlocked'}`}
          onClick={() => { if (locked) setSignInPromptOpen(true); else void signOutAccount(); }}
          aria-label={locked ? 'Sign in' : 'Log out'}
        >
          <FontAwesomeIcon icon={locked ? faRightToBracket : faRightFromBracket} />
        </button>
      }
    >
      {showSignInPrompt ? (
        <SignInPrompt key={signInNonce} />
      ) : (
        <div className="account-menu">
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
              <span className="account-menu-option-sub">Time zone, family code, and reset</span>
            </span>
          </button>
          <div className="account-menu-version">v{APP_VERSION}</div>
        </div>
      )}
    </Modal>
  );
}

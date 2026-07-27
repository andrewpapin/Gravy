import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import { AppIcon } from './AppIcon';
import { Modal } from './Modal';
import { SignInPrompt } from './SignInPrompt';
import { FullPageOverlay } from './FullPageOverlay';

interface ProfileSwitcherProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

// Self-gates like ApprovalsDrawer: re-locks immediately if grownUpUnlocked flips false while
// this is already open, rather than trusting only the AccountMenu lock check it was opened
// through.
export function ProfileSwitcher({ open, onClose, onBack }: ProfileSwitcherProps) {
  const { profiles, activeProfileId, switchProfile, grownUpUnlocked } = useGravy();
  const locked = !grownUpUnlocked;
  const [signInNonce, setSignInNonce] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSignInNonce((n) => n + 1);
  }

  const pick = (id: string) => {
    switchProfile(id);
    onClose();
  };

  // FullPageOverlay has no hidden state (unlike Modal's `open` prop) — must gate on `open` here,
  // not just `locked`, or this would render on top of everything even while closed.
  if (open && locked) {
    return (
      <FullPageOverlay onBack={onBack}>
        <SignInPrompt key={signInNonce} />
      </FullPageOverlay>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="Close switch profile"
      title="Switch Profile"
      onBack={onBack}
    >
      <div className="profile-list">
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`profile-card ${p.id === activeProfileId ? 'active' : ''}`}
            onClick={() => pick(p.id)}
          >
            <span
              className="avatar-preview-circle"
              style={{ background: p.avatarBgColor, color: p.avatarIconColor }}
              aria-hidden="true"
            >
              <AppIcon iconKey={p.avatarIcon} emojiFallback="😊" />
            </span>
            <span className="profile-card-text">
              <span className="profile-card-name">{p.name}</span>
              <span className="profile-card-sub">{p.points} pts</span>
            </span>
            {p.id === activeProfileId && (
              <FontAwesomeIcon icon={faCheck} className="profile-card-check" />
            )}
          </button>
        ))}
      </div>
    </Modal>
  );
}

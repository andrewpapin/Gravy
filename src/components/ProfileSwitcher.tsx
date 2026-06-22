import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import { PinScreen } from './PinScreen';
import { AppIcon } from './AppIcon';

type Stage = 'pin' | 'list';

interface ProfileSwitcherProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileSwitcher({ open, onClose }: ProfileSwitcherProps) {
  const { profiles, activeProfileId, switchProfile } = useGravy();
  const [stage, setStage] = useState<Stage>('pin');
  // Re-prompt the PIN on every fresh open, adjusted during render (not an effect).
  const [prevOpen, setPrevOpen] = useState(open);
  // Bumped on every fresh open so <PinScreen key={pinNonce}> remounts — this switcher stays
  // mounted at all times (visibility is CSS-only), so a stale instance would otherwise hold
  // its own lockout state from whenever it last mounted instead of the latest shared lockout.
  const [pinNonce, setPinNonce] = useState(0);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStage('pin');
      setPinNonce((n) => n + 1);
    }
  }

  const pick = (id: string) => {
    switchProfile(id);
    onClose();
  };

  return (
    <div
      className={`calendar-modal-overlay ${open ? 'show' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="calendar-modal-sheet">
        <div className="calendar-modal-header">
          <span className="calendar-modal-title">Switch Profile</span>
          <button className="calendar-modal-close" onClick={onClose} aria-label="Close" type="button">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="calendar-modal-body">
          {stage === 'pin' ? (
            <PinScreen key={pinNonce} onSuccess={() => setStage('list')} />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

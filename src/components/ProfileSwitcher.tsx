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
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setStage('pin');
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
            <PinScreen onSuccess={() => setStage('list')} />
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

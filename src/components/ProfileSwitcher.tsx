import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import { AppIcon } from './AppIcon';
import { Modal } from './Modal';

interface ProfileSwitcherProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

export function ProfileSwitcher({ open, onClose, onBack }: ProfileSwitcherProps) {
  const { profiles, activeProfileId, switchProfile } = useGravy();

  const pick = (id: string) => {
    switchProfile(id);
    onClose();
  };

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

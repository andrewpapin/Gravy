import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faLockOpen } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import { AppIcon } from './AppIcon';
import { Greeting } from './Greeting';

interface TopBarProps {
  dateStr: string;
  onOpenAccountMenu?: () => void;
}

export function TopBar({ dateStr, onOpenAccountMenu }: TopBarProps) {
  const { state, grownUpUnlocked } = useGravy();
  const pendingCount = state.pendingRewards.length;

  return (
    <div className="topbar">
      <div
        className="topbar-avatar"
        aria-hidden="true"
        style={{ background: state.settings.avatarBgColor, color: state.settings.avatarIconColor }}
      >
        <AppIcon iconKey={state.settings.avatarIcon} emojiFallback="😊" />
      </div>
      <Greeting dateStr={dateStr} />
      <div className="topbar-pills">
        {onOpenAccountMenu && (
          <button
            className="topbar-icon-btn"
            onClick={onOpenAccountMenu}
            aria-label="Open grown-up menu"
            type="button"
          >
            <span
              className="nav-badge"
              data-count={pendingCount}
              title={pendingCount > 0 ? `${pendingCount} request${pendingCount === 1 ? '' : 's'} waiting for approval` : undefined}
            >
              <FontAwesomeIcon icon={grownUpUnlocked ? faLockOpen : faLock} />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

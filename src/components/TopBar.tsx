import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faCloudArrowUp, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import { AppIcon } from './AppIcon';
import { Greeting } from './Greeting';

interface TopBarProps {
  dateStr: string;
  onOpenAvatarMenu?: () => void;
  onOpenHistory?: () => void;
}

export function TopBar({ dateStr, onOpenAvatarMenu, onOpenHistory }: TopBarProps) {
  const { state, householdCode, syncStatus } = useGravy();
  const syncError = !!householdCode && syncStatus === 'error';
  const pendingCount = state.pendingRewards.length;
  // The internal balance can dip below zero after a large deduction; never show negative.
  const displayPoints = Math.max(0, state.points);

  return (
    <div className="topbar">
      {onOpenAvatarMenu && (
        <button
          className="topbar-icon-btn topbar-avatar-btn"
          onClick={onOpenAvatarMenu}
          aria-label="Open account menu"
          type="button"
          style={{ background: state.settings.avatarBgColor, color: state.settings.avatarIconColor }}
        >
          <span
            className="nav-badge"
            data-count={pendingCount}
            title={pendingCount > 0 ? `${pendingCount} request${pendingCount === 1 ? '' : 's'} waiting for approval` : undefined}
          >
            <AppIcon iconKey={state.settings.avatarIcon} emojiFallback="😊" />
          </span>
        </button>
      )}
      <Greeting dateStr={dateStr} />
      <div className="topbar-pills">
        <div className="points-pill" aria-label={`${displayPoints} points`}>
          <FontAwesomeIcon icon={faStar} /> <span>{displayPoints}</span>
          {syncError && (
            <span
              className="sync-warning-icon"
              title="Sync issue — your progress is saved here and will sync once connection is back"
              aria-label="Sync issue — progress saved locally"
              role="img"
            >
              <FontAwesomeIcon icon={faCloudArrowUp} aria-hidden="true" />
            </span>
          )}
        </div>
        {onOpenHistory && (
          <button
            className="topbar-icon-btn"
            onClick={onOpenHistory}
            aria-label="View history calendar"
            type="button"
          >
            <FontAwesomeIcon icon={faCalendarDays} />
          </button>
        )}
      </div>
    </div>
  );
}

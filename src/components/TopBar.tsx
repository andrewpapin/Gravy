import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faCloudArrowUp } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import { AppIcon } from './AppIcon';

interface TopBarProps {
  title: string;
  highlightLast?: boolean;
  onOpenAvatarMenu?: () => void;
}

export function TopBar({ title, highlightLast, onOpenAvatarMenu }: TopBarProps) {
  const { state, householdCode, syncStatus } = useGravy();
  const splitIndex = title.lastIndexOf(' ');
  const syncError = !!householdCode && syncStatus === 'error';
  const pendingCount = state.pendingRewards.length;
  // The internal balance can dip below zero after a large deduction; never show negative.
  const displayPoints = Math.max(0, state.points);

  return (
    <div className="topbar">
      {highlightLast && splitIndex !== -1 ? (
        <span className="topbar-title">
          {title.slice(0, splitIndex)}{' '}
          <span className="topbar-title-accent">{title.slice(splitIndex + 1)}</span>
        </span>
      ) : (
        <span className="topbar-title">{title}</span>
      )}
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
        {onOpenAvatarMenu && (
          <button
            className="topbar-icon-btn"
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
      </div>
    </div>
  );
}

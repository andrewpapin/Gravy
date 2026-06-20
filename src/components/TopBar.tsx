import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faCloudArrowUp, faFaceSmile, faGift } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';

interface TopBarProps {
  title: string;
  highlightLast?: boolean;
  onOpenStore?: () => void;
  onOpenAvatarMenu?: () => void;
}

export function TopBar({ title, highlightLast, onOpenStore, onOpenAvatarMenu }: TopBarProps) {
  const { state, householdCode, syncStatus } = useGravy();
  const splitIndex = title.lastIndexOf(' ');
  const syncError = !!householdCode && syncStatus === 'error';
  const pendingCount = state.pendingRewards.length;

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
        {onOpenStore && (
          <button className="topbar-icon-btn" onClick={onOpenStore} aria-label="Open store" type="button">
            <span
              className="nav-badge"
              data-count={pendingCount}
              title={pendingCount > 0 ? `${pendingCount} request${pendingCount === 1 ? '' : 's'} waiting for approval` : undefined}
            >
              <FontAwesomeIcon icon={faGift} />
            </span>
          </button>
        )}
        <div className="points-pill" aria-label={`${state.points} points`}>
          <FontAwesomeIcon icon={faStar} /> <span>{state.points}</span>
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
          <button className="topbar-icon-btn" onClick={onOpenAvatarMenu} aria-label="Open account menu" type="button">
            <FontAwesomeIcon icon={faFaceSmile} />
          </button>
        )}
      </div>
    </div>
  );
}

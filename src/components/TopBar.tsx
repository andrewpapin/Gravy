import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faCloudArrowUp, faCartShopping } from '@fortawesome/free-solid-svg-icons';
import { useGrubClub } from '../state/GrubClubContext';

interface TopBarProps {
  title: string;
  highlightLast?: boolean;
  onTapPoints?: () => void;
}

export function TopBar({ title, highlightLast, onTapPoints }: TopBarProps) {
  const { state, householdCode, syncStatus } = useGrubClub();
  const splitIndex = title.lastIndexOf(' ');
  const syncError = !!householdCode && syncStatus === 'error';
  const pendingCount = state.pendingRewards.length;

  const pillContent = (
    <>
      <FontAwesomeIcon icon={faStar} /> <span>{state.points}</span>
      {onTapPoints && (
        <span
          className="nav-icon nav-badge points-pill-cart"
          data-count={pendingCount}
          title={pendingCount > 0 ? `${pendingCount} request${pendingCount === 1 ? '' : 's'} waiting for approval` : undefined}
        >
          <FontAwesomeIcon icon={faCartShopping} />
        </span>
      )}
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
    </>
  );

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
        {onTapPoints ? (
          <button type="button" className="points-pill" onClick={onTapPoints} aria-label={`${state.points} points, tap to open the store`}>
            {pillContent}
          </button>
        ) : (
          <div className="points-pill" aria-label={`${state.points} points`}>
            {pillContent}
          </div>
        )}
      </div>
    </div>
  );
}

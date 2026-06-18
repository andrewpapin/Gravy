import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faCloudArrowUp } from '@fortawesome/free-solid-svg-icons';
import { useGrubClub } from '../state/GrubClubContext';

interface TopBarProps {
  title: string;
  highlightLast?: boolean;
}

export function TopBar({ title, highlightLast }: TopBarProps) {
  const { state, householdCode, syncStatus } = useGrubClub();
  const splitIndex = title.lastIndexOf(' ');
  const syncError = !!householdCode && syncStatus === 'error';

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
      </div>
    </div>
  );
}

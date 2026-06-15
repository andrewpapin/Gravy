import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faCloudArrowUp, faTrophy } from '@fortawesome/free-solid-svg-icons';
import { useGrubClub } from '../state/GrubClubContext';

interface TopBarProps {
  title: string;
  highlightLast?: boolean;
  onEnterParent?: () => void;
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
        <div className="points-pill">
          <FontAwesomeIcon icon={faStar} /> <span>{state.points}</span>
          {syncError && (
            <span className="sync-warning-icon" title="Sync issue — your progress is saved here and will sync once connection is back">
              <FontAwesomeIcon icon={faCloudArrowUp} />
            </span>
          )}
        </div>
        <div className="trophy-pill">
          <FontAwesomeIcon icon={faTrophy} /> <span>{state.earnedBadges.length}</span>
        </div>
      </div>
    </div>
  );
}

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faBell } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';

interface TopBarProps {
  onOpenAccountMenu?: () => void;
  onOpenApprovals?: () => void;
}

export function TopBar({ onOpenAccountMenu, onOpenApprovals }: TopBarProps) {
  const { state } = useGravy();
  const pendingCount = state.pendingRewards.length + state.pendingPointsAwards.length;

  return (
    <div className="topbar">
      <div className="topbar-pills">
        {onOpenApprovals && (
          <button
            className="topbar-icon-btn"
            onClick={onOpenApprovals}
            aria-label="Open approvals"
            type="button"
          >
            <span
              className="nav-badge"
              data-count={pendingCount}
              title={pendingCount > 0 ? `${pendingCount} request${pendingCount === 1 ? '' : 's'} waiting for approval` : undefined}
            >
              <FontAwesomeIcon icon={faBell} />
            </span>
          </button>
        )}
        {onOpenAccountMenu && (
          <button
            className="topbar-icon-btn"
            onClick={onOpenAccountMenu}
            aria-label="Open grown-up menu"
            type="button"
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
        )}
      </div>
    </div>
  );
}

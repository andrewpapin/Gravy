import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faGift, faMedal, faGear } from '@fortawesome/free-solid-svg-icons';
import { useGrubClub } from '../state/GrubClubContext';

export type Tab = 'home' | 'store' | 'badges';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  onEnterParent: () => void;
}

export function BottomNav({ active, onChange, onEnterParent }: BottomNavProps) {
  const { state } = useGrubClub();
  const pendingCount = state.pendingRewards.length;

  return (
    <nav className="bottom-nav">
      <button className={`nav-btn ${active === 'home' ? 'active' : ''}`} onClick={() => onChange('home')}>
        <span className="nav-icon"><FontAwesomeIcon icon={faHouse} /></span>Home
      </button>
      <button className={`nav-btn ${active === 'store' ? 'active' : ''}`} onClick={() => onChange('store')}>
        <span
          className="nav-icon nav-badge"
          data-count={pendingCount}
          title={pendingCount > 0 ? `${pendingCount} request${pendingCount === 1 ? '' : 's'} waiting for approval` : undefined}
        >
          <FontAwesomeIcon icon={faGift} />
        </span>
        Store
      </button>
      <button className={`nav-btn ${active === 'badges' ? 'active' : ''}`} onClick={() => onChange('badges')}>
        <span className="nav-icon"><FontAwesomeIcon icon={faMedal} /></span>Badges
      </button>
      <button className="nav-btn" onClick={onEnterParent}>
        <span className="nav-icon"><FontAwesomeIcon icon={faGear} /></span>Settings
      </button>
    </nav>
  );
}

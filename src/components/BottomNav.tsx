import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faMedal, faGear } from '@fortawesome/free-solid-svg-icons';

export type Tab = 'home' | 'store' | 'badges';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  onEnterParent: () => void;
}

export function BottomNav({ active, onChange, onEnterParent }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      <button className={`nav-btn ${active === 'home' ? 'active' : ''}`} onClick={() => onChange('home')}>
        <span className="nav-icon"><FontAwesomeIcon icon={faHouse} /></span>Home
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

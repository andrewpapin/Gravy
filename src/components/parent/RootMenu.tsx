import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faListCheck, faGamepad, faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

export type RootDest = 'goals-store' | 'arcade';

interface RootMenuProps {
  onNavigate: (dest: RootDest) => void;
}

export function RootMenu({ onNavigate }: RootMenuProps) {
  return (
    <div>
      <button className="menu-card" onClick={() => onNavigate('goals-store')} type="button">
        <span className="menu-card-icon"><FontAwesomeIcon icon={faListCheck} /></span>
        <div className="menu-card-body">
          <div className="menu-card-title">Goals &amp; Store</div>
          <div className="menu-card-sub">Daily goals, bonus items, food points, and rewards</div>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="menu-card-chevron" />
      </button>
      <button className="menu-card" onClick={() => onNavigate('arcade')} type="button">
        <span className="menu-card-icon"><FontAwesomeIcon icon={faGamepad} /></span>
        <div className="menu-card-body">
          <div className="menu-card-title">Arcade</div>
          <div className="menu-card-sub">Points earned from winning games</div>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="menu-card-chevron" />
      </button>
    </div>
  );
}

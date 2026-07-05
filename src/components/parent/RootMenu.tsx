import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faListCheck, faBowlFood, faStar, faCartShopping, faGamepad, faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

export type RootDest = 'daily-goals' | 'food-tray' | 'bonus-points' | 'store' | 'arcade';

interface RootMenuProps {
  onNavigate: (dest: RootDest) => void;
}

export function RootMenu({ onNavigate }: RootMenuProps) {
  return (
    <div>
      <button className="menu-card" onClick={() => onNavigate('daily-goals')} type="button">
        <span className="menu-card-icon"><FontAwesomeIcon icon={faListCheck} /></span>
        <div className="menu-card-body">
          <div className="menu-card-title">Daily Goals</div>
          <div className="menu-card-sub">Goals your child completes each day</div>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="menu-card-chevron" />
      </button>
      <button className="menu-card" onClick={() => onNavigate('food-tray')} type="button">
        <span className="menu-card-icon"><FontAwesomeIcon icon={faBowlFood} /></span>
        <div className="menu-card-body">
          <div className="menu-card-title">Food Tray Goals</div>
          <div className="menu-card-sub">Points for eating each food group</div>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="menu-card-chevron" />
      </button>
      <button className="menu-card" onClick={() => onNavigate('bonus-points')} type="button">
        <span className="menu-card-icon"><FontAwesomeIcon icon={faStar} /></span>
        <div className="menu-card-body">
          <div className="menu-card-title">Bonus Points</div>
          <div className="menu-card-sub">Extra points and deductions for behavior</div>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="menu-card-chevron" />
      </button>
      <button className="menu-card" onClick={() => onNavigate('store')} type="button">
        <span className="menu-card-icon"><FontAwesomeIcon icon={faCartShopping} /></span>
        <div className="menu-card-body">
          <div className="menu-card-title">Store</div>
          <div className="menu-card-sub">Rewards your child can redeem</div>
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

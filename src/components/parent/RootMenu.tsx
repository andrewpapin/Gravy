import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck, faListCheck, faCartShopping, faMedal, faGear, faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

export type RootDest = 'approvals' | 'goals' | 'store' | 'badges' | 'settings';

interface RootMenuProps {
  pendingCount: number;
  onNavigate: (dest: RootDest) => void;
}

export function RootMenu({ pendingCount, onNavigate }: RootMenuProps) {
  return (
    <div>
      <button
        className="menu-card nav-badge"
        data-count={pendingCount}
        onClick={() => onNavigate('approvals')}
        type="button"
      >
        <span className="menu-card-icon"><FontAwesomeIcon icon={faCircleCheck} /></span>
        <div className="menu-card-body">
          <div className="menu-card-title">Approvals</div>
          <div className="menu-card-sub">
            {pendingCount > 0 ? `${pendingCount} request${pendingCount === 1 ? '' : 's'} waiting` : 'No pending requests'}
          </div>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="menu-card-chevron" />
      </button>
      <button className="menu-card" onClick={() => onNavigate('goals')} type="button">
        <span className="menu-card-icon"><FontAwesomeIcon icon={faListCheck} /></span>
        <div className="menu-card-body">
          <div className="menu-card-title">Goals</div>
          <div className="menu-card-sub">Daily goals, bonus items, and food points</div>
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
      <button className="menu-card" onClick={() => onNavigate('badges')} type="button">
        <span className="menu-card-icon"><FontAwesomeIcon icon={faMedal} /></span>
        <div className="menu-card-body">
          <div className="menu-card-title">Badges</div>
          <div className="menu-card-sub">Customize the badge library</div>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="menu-card-chevron" />
      </button>
      <button className="menu-card" onClick={() => onNavigate('settings')} type="button">
        <span className="menu-card-icon"><FontAwesomeIcon icon={faGear} /></span>
        <div className="menu-card-body">
          <div className="menu-card-title">Settings</div>
          <div className="menu-card-sub">PIN, cloud sync, and reset</div>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="menu-card-chevron" />
      </button>
    </div>
  );
}

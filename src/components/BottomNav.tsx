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
        <span className="nav-icon">🏠</span>Home
      </button>
      <button className={`nav-btn ${active === 'store' ? 'active' : ''}`} onClick={() => onChange('store')}>
        <span className="nav-icon nav-badge" data-count={pendingCount}>
          🛒
        </span>
        Store
      </button>
      <button className={`nav-btn ${active === 'badges' ? 'active' : ''}`} onClick={() => onChange('badges')}>
        <span className="nav-icon">🏅</span>Badges
      </button>
      <button className="nav-btn" onClick={onEnterParent}>
        <span className="nav-icon">🔒</span>Grown-ups
      </button>
    </nav>
  );
}

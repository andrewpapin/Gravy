import { TopBar } from './TopBar';
import { ProfileRow } from './ProfileRow';
import { StatsCard } from './StatsCard';
import { FoodTray } from './FoodTray';
import { DailyGoals } from './DailyGoals';
import { BonusPoints } from './BonusPoints';
import { useGravy } from '../state/GravyContext';
import { todayStr } from '../state/defaultState';

interface HomeScreenProps {
  onOpenAccountMenu: () => void;
  onOpenApprovals: () => void;
  onOpenStore: () => void;
  onOpenGames: () => void;
  onOpenRank: () => void;
}

export function HomeScreen({ onOpenAccountMenu, onOpenApprovals, onOpenStore, onOpenGames, onOpenRank }: HomeScreenProps) {
  const { state } = useGravy();
  const today = todayStr(state.settings.timezone);

  return (
    <div className="screen active">
      <TopBar onOpenAccountMenu={onOpenAccountMenu} onOpenApprovals={onOpenApprovals} />
      <div className="scroll-area">
        <ProfileRow dateStr={today} onOpenGames={onOpenGames} />
        <StatsCard onOpenRank={onOpenRank} onOpenStore={onOpenStore} />
        <FoodTray dateStr={today} />
        <DailyGoals dateStr={today} />
        <BonusPoints dateStr={today} />
      </div>
    </div>
  );
}

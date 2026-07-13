import { TopBar } from './TopBar';
import { QuickLinksRow } from './QuickLinksRow';
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
  onOpenDailyGame: () => void;
  onOpenRank: () => void;
}

export function HomeScreen({ onOpenAccountMenu, onOpenApprovals, onOpenStore, onOpenDailyGame, onOpenRank }: HomeScreenProps) {
  const { state } = useGravy();
  const today = todayStr(state.settings.timezone);

  return (
    <div className="screen active">
      <TopBar dateStr={today} onOpenAccountMenu={onOpenAccountMenu} onOpenApprovals={onOpenApprovals} />
      <div className="scroll-area">
        <QuickLinksRow onOpenDailyGame={onOpenDailyGame} onOpenRank={onOpenRank} onOpenStore={onOpenStore} />
        <StatsCard onOpenRank={onOpenRank} onOpenStore={onOpenStore} />
        <FoodTray dateStr={today} />
        <DailyGoals dateStr={today} />
        <BonusPoints dateStr={today} />
      </div>
    </div>
  );
}

import { TopBar } from './TopBar';
import { StatsCard } from './StatsCard';
import { GamesCard } from './GamesCard';
import { FoodTray } from './FoodTray';
import { DailyGoals } from './DailyGoals';
import { BonusPoints } from './BonusPoints';
import { useGravy } from '../state/GravyContext';
import { todayStr } from '../state/defaultState';

interface HomeScreenProps {
  onOpenAccountMenu: () => void;
  onOpenStore: () => void;
  onOpenBadges: () => void;
  onOpenGames: () => void;
  onOpenRank: () => void;
}

export function HomeScreen({ onOpenAccountMenu, onOpenStore, onOpenBadges, onOpenGames, onOpenRank }: HomeScreenProps) {
  const { state } = useGravy();
  const today = todayStr(state.settings.timezone);

  return (
    <div className="screen active">
      <TopBar dateStr={today} onOpenAccountMenu={onOpenAccountMenu} />
      <div className="scroll-area">
        <StatsCard onOpenBadges={onOpenBadges} onOpenRank={onOpenRank} onOpenStore={onOpenStore} />
        <GamesCard onOpen={onOpenGames} />
        <FoodTray dateStr={today} />
        <DailyGoals dateStr={today} />
        <BonusPoints dateStr={today} />
      </div>
    </div>
  );
}

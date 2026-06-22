import { TopBar } from './TopBar';
import { Greeting } from './Greeting';
import { StatsCard } from './StatsCard';
import { GamesCard } from './GamesCard';
import { FoodTray } from './FoodTray';
import { DailyGoals } from './DailyGoals';
import { BonusPoints } from './BonusPoints';

interface HomeScreenProps {
  onOpenAvatarMenu: () => void;
  onOpenBadges: () => void;
  onOpenGames: () => void;
  onOpenRank: () => void;
}

export function HomeScreen({ onOpenAvatarMenu, onOpenBadges, onOpenGames, onOpenRank }: HomeScreenProps) {
  return (
    <div className="screen active">
      <TopBar title="Gravy" highlightLast onOpenAvatarMenu={onOpenAvatarMenu} />
      <div className="scroll-area">
        <Greeting />
        <StatsCard onOpenBadges={onOpenBadges} onOpenRank={onOpenRank} />
        <GamesCard onOpen={onOpenGames} />
        <FoodTray />
        <DailyGoals />
        <BonusPoints />
      </div>
    </div>
  );
}

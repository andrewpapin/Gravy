import { TopBar } from './TopBar';
import { Greeting } from './Greeting';
import { StatsCard } from './StatsCard';
import { FoodTray } from './FoodTray';
import { DailyGoals } from './DailyGoals';
import { BonusPoints } from './BonusPoints';

interface HomeScreenProps {
  onOpenAvatarMenu: () => void;
  onOpenBadges: () => void;
}

export function HomeScreen({ onOpenAvatarMenu, onOpenBadges }: HomeScreenProps) {
  return (
    <div className="screen active">
      <TopBar title="Gravy" highlightLast onOpenAvatarMenu={onOpenAvatarMenu} />
      <div className="scroll-area">
        <Greeting />
        <StatsCard onOpenBadges={onOpenBadges} />
        <FoodTray />
        <DailyGoals />
        <BonusPoints />
      </div>
    </div>
  );
}

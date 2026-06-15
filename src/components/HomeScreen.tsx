import { TopBar } from './TopBar';
import { RankBanner } from './RankBanner';
import { StreakCard } from './StreakCard';
import { FoodTray } from './FoodTray';
import { ChoreList } from './ChoreList';

export function HomeScreen() {
  return (
    <div className="screen active">
      <TopBar title="Grub Club" />
      <div className="scroll-area">
        <RankBanner />
        <StreakCard />
        <FoodTray />
        <ChoreList />
      </div>
    </div>
  );
}

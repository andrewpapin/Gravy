import { TopBar } from './TopBar';
import { StatsCard } from './StatsCard';
import { DateNav } from './DateNav';
import { FoodTray } from './FoodTray';
import { DailyGoals } from './DailyGoals';
import { BonusPoints } from './BonusPoints';

interface HomeScreenProps {
  onOpenAvatarMenu: () => void;
  onOpenCalendar: () => void;
  onOpenStore: () => void;
  onOpenBadges: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function HomeScreen({ onOpenAvatarMenu, onOpenCalendar, onOpenStore, onOpenBadges, selectedDate, onSelectDate }: HomeScreenProps) {
  return (
    <div className="screen active">
      <TopBar title="Gravy" highlightLast onOpenStore={onOpenStore} onOpenAvatarMenu={onOpenAvatarMenu} />
      <div className="scroll-area">
        <StatsCard onOpenBadges={onOpenBadges} />
        <DateNav selectedDate={selectedDate} onSelectDate={onSelectDate} onOpenCalendar={onOpenCalendar} />
        <FoodTray dateStr={selectedDate} />
        <DailyGoals dateStr={selectedDate} />
        <BonusPoints dateStr={selectedDate} />
      </div>
    </div>
  );
}

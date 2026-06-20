import { TopBar } from './TopBar';
import { StatsCard } from './StatsCard';
import { DateNav } from './DateNav';
import { FoodTray } from './FoodTray';
import { DailyGoals } from './DailyGoals';
import { OtherGoals } from './OtherGoals';
import { DaySummaryCard } from './DaySummaryCard';
import { useGravy } from '../state/GravyContext';
import { todayStr } from '../state/defaultState';

interface HomeScreenProps {
  onOpenAvatarMenu: () => void;
  onOpenCalendar: () => void;
  onOpenStore: () => void;
  onOpenBadges: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function HomeScreen({ onOpenAvatarMenu, onOpenCalendar, onOpenStore, onOpenBadges, selectedDate, onSelectDate }: HomeScreenProps) {
  const { state } = useGravy();
  const today = todayStr();
  const isToday = selectedDate === today;
  const hasOtherGoals = state.goals.some((g) => g.isDaily === false);

  return (
    <div className="screen active">
      <TopBar title="Gravy" highlightLast onOpenStore={onOpenStore} onOpenAvatarMenu={onOpenAvatarMenu} />
      <div className="scroll-area">
        <StatsCard onOpenBadges={onOpenBadges} />
        <DateNav selectedDate={selectedDate} onSelectDate={onSelectDate} onOpenCalendar={onOpenCalendar} />
        {isToday ? (
          <>
            <FoodTray />
            <DailyGoals />
            {hasOtherGoals && <OtherGoals />}
          </>
        ) : (
          <DaySummaryCard dateStr={selectedDate} />
        )}
      </div>
    </div>
  );
}

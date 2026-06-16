import { TopBar } from './TopBar';
import { StatsCard } from './StatsCard';
import { WeekStrip } from './WeekStrip';
import { FoodTray } from './FoodTray';
import { DailyGoals } from './DailyGoals';
import { OtherGoals } from './OtherGoals';
import { DaySummaryCard } from './DaySummaryCard';
import { useGrubClub } from '../state/GrubClubContext';
import { todayStr } from '../state/defaultState';

interface HomeScreenProps {
  onEnterParent: () => void;
  onOpenCalendar: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function HomeScreen({ onEnterParent: _onEnterParent, onOpenCalendar, selectedDate, onSelectDate }: HomeScreenProps) {
  const { state } = useGrubClub();
  const today = todayStr();
  const isToday = selectedDate === today;
  const hasOtherGoals = state.goals.some((g) => g.isDaily === false);

  return (
    <div className="screen active">
      <TopBar title="Grub Club" highlightLast />
      <div className="scroll-area">
        <WeekStrip selectedDate={selectedDate} onSelectDate={onSelectDate} onOpenCalendar={onOpenCalendar} />
        <StatsCard />
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

import { useState } from 'react';
import { TopBar } from './TopBar';
import { StatsCard } from './StatsCard';
import { WeekStrip } from './WeekStrip';
import { TodaysGoals } from './TodaysGoals';
import { OtherGoals } from './OtherGoals';
import { DaySummaryCard } from './DaySummaryCard';
import { useGrubClub } from '../state/GrubClubContext';
import { todayStr } from '../state/defaultState';

interface HomeScreenProps {
  onEnterParent: () => void;
  onOpenCalendar: () => void;
}

export function HomeScreen({ onEnterParent: _onEnterParent, onOpenCalendar }: HomeScreenProps) {
  const { state } = useGrubClub();
  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = selectedDate === today;
  const hasOtherGoals = state.goals.some((g) => g.isDaily === false);

  return (
    <div className="screen active">
      <TopBar title="Grub Club" highlightLast />
      <div className="scroll-area">
        <WeekStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} onOpenCalendar={onOpenCalendar} />
        <StatsCard />
        {isToday ? (
          <>
            <TodaysGoals />
            {hasOtherGoals && <OtherGoals />}
          </>
        ) : (
          <DaySummaryCard dateStr={selectedDate} />
        )}
      </div>
    </div>
  );
}

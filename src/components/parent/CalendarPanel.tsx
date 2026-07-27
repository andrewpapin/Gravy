import { useEffect, useState } from 'react';
import { useGravy } from '../../state/GravyContext';
import { getDayLog } from '../../state/dayLog';
import { formatFriendlyDate, todayStr } from '../../state/defaultState';
import { CalendarGrid } from '../CalendarGrid';
import { FoodTray } from '../FoodTray';
import { DailyGoals } from '../DailyGoals';
import { BonusPoints } from '../BonusPoints';
import { OopsForgotButton } from './OopsForgotButton';

interface CalendarPanelProps {
  onHeaderChange: (header: { title: string; onBack?: () => void }) => void;
  goToRoot: () => void;
}

export function CalendarPanel({ onHeaderChange, goToRoot }: CalendarPanelProps) {
  const { state } = useGravy();
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  useEffect(() => {
    if (pickedDate) {
      onHeaderChange({ title: formatFriendlyDate(pickedDate), onBack: () => setPickedDate(null) });
    } else {
      onHeaderChange({ title: 'Calendar', onBack: goToRoot });
    }
  }, [pickedDate, onHeaderChange, goToRoot]);

  if (pickedDate) {
    const today = todayStr(state.settings.timezone);
    const locked = getDayLog(state, pickedDate, today)?.oopsPoints !== undefined;
    return (
      <div>
        <OopsForgotButton dateStr={pickedDate} />
        <FoodTray dateStr={pickedDate} locked={locked} />
        <DailyGoals dateStr={pickedDate} locked={locked} />
        <BonusPoints dateStr={pickedDate} locked={locked} />
      </div>
    );
  }

  return <CalendarGrid onPickDate={setPickedDate} />;
}

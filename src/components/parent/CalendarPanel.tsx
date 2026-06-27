import { useEffect, useState } from 'react';
import { formatFriendlyDate } from '../../state/defaultState';
import { CalendarGrid } from '../CalendarGrid';
import { FoodTray } from '../FoodTray';
import { DailyGoals } from '../DailyGoals';
import { BonusPoints } from '../BonusPoints';

interface CalendarPanelProps {
  onHeaderChange: (header: { title: string; onBack?: () => void }) => void;
  goToRoot: () => void;
}

export function CalendarPanel({ onHeaderChange, goToRoot }: CalendarPanelProps) {
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  useEffect(() => {
    if (pickedDate) {
      onHeaderChange({ title: formatFriendlyDate(pickedDate), onBack: () => setPickedDate(null) });
    } else {
      onHeaderChange({ title: 'Calendar', onBack: goToRoot });
    }
  }, [pickedDate, onHeaderChange, goToRoot]);

  if (pickedDate) {
    return (
      <div>
        <FoodTray dateStr={pickedDate} />
        <DailyGoals dateStr={pickedDate} />
        <BonusPoints dateStr={pickedDate} />
      </div>
    );
  }

  return <CalendarGrid onPickDate={setPickedDate} />;
}

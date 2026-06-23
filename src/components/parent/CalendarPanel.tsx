import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { todayStr } from '../../state/defaultState';
import { getDayLog, hasAnyLog } from '../../state/dayLog';
import { FoodTray } from '../FoodTray';
import { DailyGoals } from '../DailyGoals';
import { BonusPoints } from '../BonusPoints';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function formatPickedDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

interface CalendarPanelProps {
  onHeaderChange: (header: { title: string; onBack?: () => void }) => void;
  goToRoot: () => void;
}

export function CalendarPanel({ onHeaderChange, goToRoot }: CalendarPanelProps) {
  const { state, showToast } = useGravy();
  const today = todayStr();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  useEffect(() => {
    if (pickedDate) {
      onHeaderChange({ title: formatPickedDate(pickedDate), onBack: () => setPickedDate(null) });
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

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (isCurrentMonth) {
      showToast(faCalendarDays, "Can't peek into the future yet!");
      return;
    }
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="card">
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={prevMonth} type="button" aria-label="Previous month">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <div className="calendar-month-label">{MONTH_NAMES[viewMonth]} {viewYear}</div>
        <button
          className={`calendar-nav-btn ${isCurrentMonth ? 'muted' : ''}`}
          onClick={nextMonth}
          type="button"
          aria-label={isCurrentMonth ? "Can't view future months" : 'Next month'}
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
      <div className="calendar-grid calendar-weekdays">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="calendar-weekday">{w}</div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((day, i) => {
          if (day === null) return <span key={i} className="calendar-day empty" aria-hidden="true" />;
          const dateStr = toDateStr(viewYear, viewMonth, day);
          const isToday = dateStr === today;
          const log = getDayLog(state, dateStr, today);
          const hasLog = hasAnyLog(log);
          return (
            <button
              key={i}
              type="button"
              className={`calendar-day ${isToday ? 'today' : ''}`}
              onClick={() => setPickedDate(dateStr)}
              aria-label={`${day} ${MONTH_NAMES[viewMonth]}${isToday ? ', today' : ''}${hasLog ? ', has activity' : ''}`}
            >
              {day}
              {isToday && <div className="calendar-day-today-marker" aria-hidden="true" />}
              {hasLog && <div className="calendar-day-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

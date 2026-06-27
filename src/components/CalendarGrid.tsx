import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import { todayStr } from '../state/defaultState';
import { getDayLog, hasAnyLog } from '../state/dayLog';

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

interface CalendarGridProps {
  onPickDate: (dateStr: string) => void;
}

export function CalendarGrid({ onPickDate }: CalendarGridProps) {
  const { state, showToast } = useGravy();
  const today = todayStr(state.settings.timezone);
  const [todayYear, todayMonth] = today.split('-').map(Number);
  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth - 1);

  const isCurrentMonth = viewYear === todayYear && viewMonth === todayMonth - 1;

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
          const isFuture = dateStr > today;
          const log = getDayLog(state, dateStr, today);
          const hasLog = hasAnyLog(log);
          return (
            <button
              key={i}
              type="button"
              className={`calendar-day ${isToday ? 'today' : ''}`}
              onClick={() => { if (!isFuture) onPickDate(dateStr); }}
              disabled={isFuture}
              aria-label={`${day} ${MONTH_NAMES[viewMonth]}${isToday ? ', today' : isFuture ? ', not available yet' : ''}${hasLog ? ', has activity' : ''}`}
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

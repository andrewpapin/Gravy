import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { useGrubClub } from '../state/GrubClubContext';
import { todayStr } from '../state/defaultState';
import { getDayLog, hasAnyLog } from '../state/dayLog';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface WeekStripProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onOpenCalendar?: () => void;
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function WeekStrip({ selectedDate, onSelectDate, onOpenCalendar }: WeekStripProps) {
  const { state } = useGrubClub();
  const today = todayStr();
  const now = new Date();

  // Build a 7-day array starting on the Sunday of the current week
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
    return { dateStr, dayNum: d.getDate(), dayLabel: DAY_LABELS[d.getDay()] };
  });

  // Header shows the selected date's full date
  const selDateObj = new Date(selectedDate + 'T00:00:00');
  const headerLabel = `${MONTH_NAMES[selDateObj.getMonth()]}, ${selDateObj.getDate()}`;

  return (
    <div className="week-strip-card">
      <div className="week-strip-header">
        <span>{headerLabel}</span>
        {onOpenCalendar && (
          <button className="week-strip-cal-btn" onClick={onOpenCalendar} aria-label="Open calendar">
            <FontAwesomeIcon icon={faCalendarDays} />
          </button>
        )}
      </div>
      <div className="week-strip-row">
        {days.map(({ dateStr, dayNum, dayLabel }) => {
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const log = getDayLog(state, dateStr, today);
          const hasLog = hasAnyLog(log);
          return (
            <div
              key={dateStr}
              className={`week-day${isToday ? ' today' : ''}${isSelected && !isToday ? ' selected' : ''}`}
              onClick={() => onSelectDate(dateStr)}
            >
              <span className="week-day-label">{dayLabel}</span>
              <span className="week-day-num">{dayNum}</span>
              {hasLog && !isToday && !isSelected && <span className="week-day-dot" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

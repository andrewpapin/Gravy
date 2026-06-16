import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { todayStr } from '../state/defaultState';
import { useGrubClub } from '../state/GrubClubContext';
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
  const currentYear = now.getFullYear();
  const selYear = selDateObj.getFullYear();
  const yearSuffix = selYear !== currentYear ? ` ${selYear}` : '';
  const headerLabel = `${MONTH_NAMES[selDateObj.getMonth()]} ${selDateObj.getDate()}${yearSuffix}`;

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
          const hasDot = hasAnyLog(log);
          return (
            <button
              key={dateStr}
              type="button"
              className={`week-day${isToday ? ' today' : ''}${isSelected && !isToday ? ' selected' : ''}`}
              onClick={() => onSelectDate(dateStr)}
              aria-label={`${dayLabel} ${dayNum}${isToday ? ', today' : ''}${hasDot ? ', has activity' : ''}`}
              aria-pressed={isSelected}
            >
              <span className="week-day-label" aria-hidden="true">{dayLabel}</span>
              <span className="week-day-num" aria-hidden="true">{dayNum}</span>
              {hasDot && <div className="week-day-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

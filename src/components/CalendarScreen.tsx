import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faCalendarDays, faMoon } from '@fortawesome/free-solid-svg-icons';
import { TopBar } from './TopBar';
import { useGrubClub } from '../state/GrubClubContext';
import { FOODS } from '../data/foods';
import { todayStr } from '../state/defaultState';
import type { DayLog } from '../state/types';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function CalendarScreen() {
  const { state } = useGrubClub();
  const today = todayStr();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);

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
    if (isCurrentMonth) return;
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

  let selectedLog: DayLog | null = null;
  if (selectedDate === today) {
    selectedLog = {
      foodCounts: state.todayFoodCounts,
      choreIds: state.todayChores,
      points: state.todayPoints,
    };
  } else if (state.dayLogs[selectedDate]) {
    selectedLog = state.dayLogs[selectedDate];
  }

  const hasAnything = !!selectedLog && (
    Object.values(selectedLog.foodCounts).some((c) => c > 0) ||
    selectedLog.choreIds.length > 0 ||
    selectedLog.points > 0
  );

  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const selectedLabel = selectedDateObj.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="screen active">
      <TopBar title="Calendar" highlightLast />
      <div className="scroll-area">
        <div className="card">
          <div className="calendar-header">
            <button className="calendar-nav-btn" onClick={prevMonth}>
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <div className="calendar-month-label">{MONTH_NAMES[viewMonth]} {viewYear}</div>
            <button className="calendar-nav-btn" onClick={nextMonth} disabled={isCurrentMonth}>
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
              if (day === null) return <div key={i} className="calendar-day empty" />;
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const hasLog = dateStr === today
                ? (Object.values(state.todayFoodCounts).some((c) => c > 0) || state.todayChores.length > 0 || state.todayPoints > 0)
                : !!state.dayLogs[dateStr];
              return (
                <div
                  key={i}
                  className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  {day}
                  {hasLog && <div className="calendar-day-dot" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-title mb-0" style={{ marginBottom: 12 }}>
            <FontAwesomeIcon icon={faCalendarDays} /> {selectedLabel}
          </div>
          {!hasAnything ? (
            <div className="empty-state">
              <span className="empty-state-emoji"><FontAwesomeIcon icon={faMoon} /></span>
              <div className="empty-state-text">Nothing logged this day</div>
            </div>
          ) : (
            <>
              <div className="flex-between" style={{ marginBottom: 12 }}>
                <div className="settings-label">Points earned</div>
                <div className="pts-badge">+{selectedLog!.points}</div>
              </div>
              <div className="tray-grid" style={{ marginBottom: 12 }}>
                {FOODS.map((f) => {
                  const count = selectedLog!.foodCounts[f.id] || 0;
                  return (
                    <div key={f.id} className={`food-tile ${count > 0 ? 'checked' : ''}`}>
                      {count > 1 && <div className="food-count-badge">{count}</div>}
                      <div className="food-emoji">{f.emoji}</div>
                      <div className="food-label">{f.label}</div>
                    </div>
                  );
                })}
              </div>
              {selectedLog!.choreIds.length > 0 && (
                <div>
                  {selectedLog!.choreIds.map((id) => {
                    const chore = state.chores.find((c) => c.id === id);
                    if (!chore) return null;
                    return (
                      <div key={id} className="chore-item checked">
                        <div className="chore-check">✓</div>
                        <div className="chore-emoji">{chore.emoji}</div>
                        <div className="chore-info">
                          <div className="chore-name">{chore.name}</div>
                        </div>
                        <div className="pts-badge">+{chore.pts}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

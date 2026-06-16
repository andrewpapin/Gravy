import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faMoon } from '@fortawesome/free-solid-svg-icons';
import { FOODS } from '../data/foods';
import { useGrubClub } from '../state/GrubClubContext';
import { getDayLog, hasAnyLog } from '../state/dayLog';
import { todayStr } from '../state/defaultState';

interface DaySummaryCardProps {
  dateStr: string;
}

export function DaySummaryCard({ dateStr }: DaySummaryCardProps) {
  const { state } = useGrubClub();
  const today = todayStr();
  const log = getDayLog(state, dateStr, today);
  const hasActivity = hasAnyLog(log);

  const dateObj = new Date(dateStr + 'T00:00:00');
  const label = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="card">
      <div className="card-title mb-0" style={{ marginBottom: 12 }}>
        <FontAwesomeIcon icon={faCalendarDays} /> {label}
      </div>
      {!hasActivity ? (
        <div className="empty-state">
          <span className="empty-state-emoji"><FontAwesomeIcon icon={faMoon} /></span>
          <div className="empty-state-text">Nothing logged this day</div>
        </div>
      ) : (
        <>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <div className="settings-label">Points earned</div>
            <div className="pts-badge">+{log!.points}</div>
          </div>
          <div className="tray-grid" style={{ marginBottom: 12 }}>
            {FOODS.map((f) => {
              const count = log!.foodCounts[f.id] || 0;
              return (
                <div
                  key={f.id}
                  className={`food-tile ${count > 0 ? 'checked' : ''}`}
                  role="img"
                  aria-label={count > 0 ? `${f.label} eaten${count > 1 ? ` ×${count}` : ''}` : `${f.label} not eaten`}
                >
                  {count > 1 && <div className="food-count-badge" aria-hidden="true">{count}</div>}
                  <div className="food-emoji" aria-hidden="true">{f.emoji}</div>
                  <div className="food-label" aria-hidden="true">{f.label}</div>
                </div>
              );
            })}
          </div>
          {log!.goalIds.length > 0 && (
            <div>
              {log!.goalIds.map((id) => {
                const goal = state.goals.find((g) => g.id === id);
                if (!goal) return null;
                return (
                  <div key={id} className="goal-item checked">
                    <div className="goal-check">✓</div>
                    <div className="goal-emoji">{goal.emoji}</div>
                    <div className="goal-info">
                      <div className="goal-name">{goal.name}</div>
                    </div>
                    <div className="pts-badge">+{goal.pts}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

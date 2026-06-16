import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faMoon } from '@fortawesome/free-solid-svg-icons';
import { FOODS } from '../data/foods';
import { useGrubClub } from '../state/GrubClubContext';
import { getDayLog } from '../state/dayLog';
import { todayStr } from '../state/defaultState';

interface DaySummaryCardProps {
  dateStr: string;
}

export function DaySummaryCard({ dateStr }: DaySummaryCardProps) {
  const { state, logFoodForDay, removeFoodForDay, toggleGoalForDay } = useGrubClub();
  const today = todayStr();
  const log = getDayLog(state, dateStr, today);
  const isEditable = dateStr < today;

  const dateObj = new Date(dateStr + 'T00:00:00');
  const label = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  if (isEditable) {
    const foodCounts = log?.foodCounts ?? {};
    const goalIds = log?.goalIds ?? [];
    const points = log?.points ?? 0;

    return (
      <div className="card">
        <div className="card-title mb-0" style={{ marginBottom: 12 }}>
          <FontAwesomeIcon icon={faCalendarDays} /> {label}
        </div>

        {points > 0 && (
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <div className="settings-label">Points earned</div>
            <div className="pts-badge">+{points}</div>
          </div>
        )}

        <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--dark)', marginBottom: 8 }}>
          Food
        </div>
        <div className="tray-grid" style={{ marginBottom: 16 }}>
          {FOODS.map((f) => {
            const count = foodCounts[f.id] || 0;
            return (
              <div key={f.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  className={`food-tile ${count > 0 ? 'checked' : ''}`}
                  style={{ width: '100%' }}
                  onClick={() => logFoodForDay(dateStr, f.id)}
                  aria-label={`Add ${f.label}${count > 0 ? ` (${count} logged)` : ''}`}
                >
                  {count > 1 && <div className="food-count-badge" aria-hidden="true">{count}</div>}
                  <div className="food-emoji" aria-hidden="true">{f.emoji}</div>
                  <div className="food-label" aria-hidden="true">{f.label}</div>
                </button>
                <button
                  type="button"
                  onClick={() => removeFoodForDay(dateStr, f.id)}
                  aria-label={`Remove one ${f.label}`}
                  style={{
                    visibility: count > 0 ? 'visible' : 'hidden',
                    background: 'var(--cream)',
                    border: '2px solid var(--dark)',
                    borderRadius: '50px',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    padding: '1px 8px',
                    cursor: 'pointer',
                    color: 'var(--dark)',
                    lineHeight: 1.4,
                  }}
                >
                  −
                </button>
              </div>
            );
          })}
        </div>

        {state.goals.length > 0 && (
          <>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--dark)', marginBottom: 8 }}>
              Goals
            </div>
            <div>
              {state.goals.map((g) => {
                const checked = goalIds.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={`goal-item ${checked ? 'checked' : ''}`}
                    onClick={() => toggleGoalForDay(dateStr, g.id)}
                    aria-pressed={checked}
                  >
                    <div className="goal-check">{checked ? '✓' : ''}</div>
                    <div className="goal-emoji">{g.emoji}</div>
                    <div className="goal-info">
                      <div className="goal-name">{g.name}</div>
                    </div>
                    <div className="pts-badge">+{g.pts}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {state.goals.length === 0 && Object.values(foodCounts).every((c) => c === 0) && (
          <div className="empty-state" style={{ marginTop: 8 }}>
            <span className="empty-state-emoji"><FontAwesomeIcon icon={faMoon} /></span>
            <div className="empty-state-text">Tap a food to log it!</div>
          </div>
        )}
      </div>
    );
  }

  // Read-only view for today (or future, which CalendarScreen prevents)
  const isToday = dateStr === today;
  const hasActivity = log && (
    Object.values(log.foodCounts).some((c) => c > 0) || log.goalIds.length > 0 || log.points > 0
  );

  return (
    <div className="card">
      <div className="card-title mb-0" style={{ marginBottom: 12 }}>
        <FontAwesomeIcon icon={faCalendarDays} /> {label}
      </div>
      {isToday && (
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textAlign: 'center', marginBottom: 12 }}>
          Go to Home to log today's food and goals
        </div>
      )}
      {!hasActivity ? (
        <div className="empty-state">
          <span className="empty-state-emoji"><FontAwesomeIcon icon={faMoon} /></span>
          <div className="empty-state-text">{isToday ? 'Nothing logged yet today' : 'Nothing logged this day'}</div>
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

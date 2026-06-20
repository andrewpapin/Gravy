import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faMoon } from '@fortawesome/free-solid-svg-icons';
import { FOODS } from '../data/foods';
import { AppIcon } from './AppIcon';
import { useGravy } from '../state/GravyContext';
import { getDayLog } from '../state/dayLog';
import { todayStr } from '../state/defaultState';

interface DaySummaryCardProps {
  dateStr: string;
}

export function DaySummaryCard({ dateStr }: DaySummaryCardProps) {
  const { state, logFoodForDay, removeFoodForDay, toggleGoalForDay, logBonusItemForDay, undoBonusItemForDay } = useGravy();
  const today = todayStr();
  const log = getDayLog(state, dateStr, today);
  const isEditable = dateStr < today;

  const dateObj = new Date(dateStr + 'T00:00:00');
  const label = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  if (isEditable) {
    const foodCounts = log?.foodCounts ?? {};
    const goalIds = log?.goalIds ?? [];
    const points = log?.points ?? 0;
    const bonusCounts = log?.bonusCounts ?? {};
    const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
    const bonusGoals = state.goals.filter((g) => g.isDaily === false);

    return (
      <div className="card">
        <div className="card-title mb-0" style={{ marginBottom: 12 }}>
          <FontAwesomeIcon icon={faCalendarDays} /> {label}
        </div>

        {points !== 0 && (
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <div className="settings-label">Points earned</div>
            <div className={`pts-badge ${points < 0 ? 'negative' : ''}`}>
              {points < 0 ? '−' : '+'}{Math.abs(points)}
            </div>
          </div>
        )}

        <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--dark)', marginBottom: 8 }}>
          Food
        </div>
        <div className="tray-grid" style={{ marginBottom: 16 }}>
          {FOODS.map((f) => {
            const count = foodCounts[f.id] || 0;
            return (
              <button
                key={f.id}
                type="button"
                className={`food-tile ${count > 0 ? 'checked' : ''}`}
                onClick={() => (count > 0 ? removeFoodForDay(dateStr, f.id) : logFoodForDay(dateStr, f.id))}
                aria-label={count > 0 ? `${f.label}, logged. Tap to undo.` : `Add ${f.label}`}
              >
                {count > 1 && <div className="food-count-badge" aria-hidden="true">{count}</div>}
                <AppIcon iconKey={f.icon} emojiFallback={f.emoji} className="food-emoji" />
                <div className="food-label" aria-hidden="true">{f.label}</div>
              </button>
            );
          })}
        </div>

        {dailyGoals.length > 0 && (
          <>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--dark)', marginBottom: 8 }}>
              Goals
            </div>
            <div>
              {dailyGoals.map((g) => {
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
                    <AppIcon iconKey={g.icon} emojiFallback={g.emoji} className="goal-emoji" />
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

        {bonusGoals.length > 0 && (
          <>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--dark)', marginBottom: 8, marginTop: dailyGoals.length > 0 ? 16 : 0 }}>
              Bonus Points
            </div>
            <div>
              {bonusGoals.map((g) => {
                const count = bonusCounts[g.id] || 0;
                return (
                  <div key={g.id} className="goal-item">
                    <AppIcon iconKey={g.icon} emojiFallback={g.emoji} className="goal-emoji" />
                    <div className="goal-info">
                      <div className="goal-name">{g.name}</div>
                    </div>
                    <span className={`pts-badge ${g.pts < 0 ? 'negative' : ''}`}>
                      {g.pts < 0 ? '−' : '+'}{Math.abs(g.pts)}
                    </span>
                    <div className="goal-stepper">
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => undoBonusItemForDay(dateStr, g.id)}
                        disabled={count === 0}
                        aria-label={`Undo ${g.name}`}
                      >−</button>
                      <span className="stepper-count">{count}</span>
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => logBonusItemForDay(dateStr, g.id)}
                        aria-label={`Log ${g.name}`}
                      >+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {dailyGoals.length === 0 && bonusGoals.length === 0 && Object.values(foodCounts).every((c) => c === 0) && (
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
                  <AppIcon iconKey={f.icon} emojiFallback={f.emoji} className="food-emoji" />
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
                    <AppIcon iconKey={goal.icon} emojiFallback={goal.emoji} className="goal-emoji" />
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

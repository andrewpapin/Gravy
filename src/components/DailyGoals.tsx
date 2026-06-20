import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon } from '@fortawesome/free-solid-svg-icons';
import { AppIcon } from './AppIcon';
import { useGravy } from '../state/GravyContext';
import { getDayLog } from '../state/dayLog';
import { todayStr } from '../state/defaultState';

interface DailyGoalsProps {
  dateStr?: string;
}

export function DailyGoals({ dateStr }: DailyGoalsProps = {}) {
  const { state, incrementGoal, decrementGoal, toggleGoalForDay } = useGravy();
  const today = todayStr();
  const day = dateStr ?? today;
  const isToday = day === today;
  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  const goalCounts = state.todayGoalCounts || {};
  const goalIds = getDayLog(state, day, today)?.goalIds ?? [];
  const isDone = (goalId: number, target: number) =>
    isToday ? (goalCounts[goalId] || 0) >= target : goalIds.includes(goalId);
  const completedGoals = dailyGoals.filter((g) => isDone(g.id, g.target || 1)).length;
  const allDone = dailyGoals.length > 0 && completedGoals === dailyGoals.length;

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <div className="goal-card-title">Daily Goals</div>
        {dailyGoals.length > 0 && (
          <div className={`goal-progress-badge ${allDone ? 'done' : ''}`}>{completedGoals}/{dailyGoals.length} done</div>
        )}
      </div>

      {dailyGoals.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-emoji"><FontAwesomeIcon icon={faMoon} /></span>
          <div className="empty-state-text">
            No daily goals yet!
            <br />
            Ask a grown-up to add some.
          </div>
        </div>
      ) : (
        <div className="goal-grid">
          {dailyGoals.map((g) => {
            const target = g.target || 1;
            const count = goalCounts[g.id] || 0;
            const done = isDone(g.id, target);

            if (isToday && target > 1) {
              return (
                <div key={g.id} className={`goal-tile ${done ? 'checked' : ''}`}>
                  <div className="goal-tile-top">
                    <AppIcon iconKey={g.icon} emojiFallback={g.emoji} className="goal-tile-emoji" />
                    <span className="pts-badge">+{g.pts}</span>
                  </div>
                  <div className="goal-tile-name">{g.name}</div>
                  <div className="goal-stepper">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => decrementGoal(g.id)}
                      disabled={count === 0}
                      aria-label={`Undo ${g.name}`}
                    >−</button>
                    <span className="stepper-count">{count}/{target}</span>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => incrementGoal(g.id)}
                      aria-label={`Complete ${g.name}`}
                    >+</button>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={g.id}
                type="button"
                className={`goal-tile ${done ? 'checked' : ''}`}
                onClick={() => {
                  if (isToday) {
                    if (count > 0) decrementGoal(g.id); else incrementGoal(g.id);
                  } else {
                    toggleGoalForDay(day, g.id);
                  }
                }}
                aria-pressed={done}
                aria-label={done ? `${g.name}, done. Tap to undo.` : `${g.name}. Tap to complete.`}
              >
                <div className="goal-tile-top">
                  <AppIcon iconKey={g.icon} emojiFallback={g.emoji} className="goal-tile-emoji" />
                  <span className="pts-badge">+{g.pts}</span>
                </div>
                <div className="goal-tile-name">{g.name}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

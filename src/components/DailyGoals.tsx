import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faCheck } from '@fortawesome/free-solid-svg-icons';
import { AppIcon } from './AppIcon';
import { CollapsibleCard } from './CollapsibleCard';
import { useGravy } from '../state/GravyContext';
import { getDayLog } from '../state/dayLog';
import { todayStr } from '../state/defaultState';
import { triggerHaptic } from '../lib/haptics';

interface DailyGoalsProps {
  dateStr?: string;
}

export function DailyGoals({ dateStr }: DailyGoalsProps = {}) {
  const { state, incrementGoal, decrementGoal, toggleGoalForDay } = useGravy();
  const today = todayStr(state.settings.timezone);
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
    <CollapsibleCard
      section="dailyGoals"
      title="Daily Goals"
      badge={dailyGoals.length > 0 && (
        <div className={`goal-progress-badge ${allDone ? 'done' : ''}`}>{completedGoals}/{dailyGoals.length} done</div>
      )}
    >
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
                <div key={g.id} className={`gtile ${done ? 'checked' : ''}`}>
                  <span className="tile-pts">+{g.pts}</span>
                  {done && (
                    <span className="tile-check" aria-hidden="true">
                      <FontAwesomeIcon icon={faCheck} />
                    </span>
                  )}
                  <div className="gtile-body">
                    <AppIcon iconKey={g.icon} emojiFallback={g.emoji} className="gtile-icon" />
                    <div className="gtile-name">{g.name}</div>
                  </div>
                  <div className="gtile-stepper">
                    <button
                      type="button"
                      className="gstep-btn"
                      onClick={() => { triggerHaptic(); decrementGoal(g.id); }}
                      disabled={count === 0}
                      aria-label={`Undo ${g.name}`}
                    >−</button>
                    <span className="gstep-count">{count}/{target}</span>
                    <button
                      type="button"
                      className="gstep-btn"
                      onClick={() => { triggerHaptic(); incrementGoal(g.id); }}
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
                className={`gtile ${done ? 'checked' : ''}`}
                onClick={() => {
                  triggerHaptic();
                  if (isToday) {
                    if (count > 0) decrementGoal(g.id); else incrementGoal(g.id);
                  } else {
                    toggleGoalForDay(day, g.id);
                  }
                }}
                aria-pressed={done}
                aria-label={done ? `${g.name}, done. Tap to undo.` : `${g.name}. Tap to complete.`}
              >
                <span className="tile-pts">+{g.pts}</span>
                {done && (
                  <span className="tile-check" aria-hidden="true">
                    <FontAwesomeIcon icon={faCheck} />
                  </span>
                )}
                <div className="gtile-body">
                  <AppIcon iconKey={g.icon} emojiFallback={g.emoji} className="gtile-icon" />
                  <div className="gtile-name">{g.name}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </CollapsibleCard>
  );
}

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faCheck, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { AppIcon } from './AppIcon';
import { CollapsibleCard } from './CollapsibleCard';
import { useGravy } from '../state/GravyContext';
import { getDayLog } from '../state/dayLog';
import { todayStr } from '../state/defaultState';
import { triggerHaptic } from '../lib/haptics';
import { useClickGuard } from '../lib/clickGuard';

interface DailyGoalsProps {
  dateStr?: string;
}

export function DailyGoals({ dateStr }: DailyGoalsProps = {}) {
  const { state, incrementGoal, decrementGoal, toggleGoalForDay } = useGravy();
  const guardClick = useClickGuard();
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
        <div className="goal-rows">
          {dailyGoals.map((g) => {
            const target = g.target || 1;
            const count = goalCounts[g.id] || 0;
            const done = isDone(g.id, target);
            const isStepper = isToday && target > 1;
            const stepperStarted = isStepper && count > 0;

            const toggleCheck = () => {
              triggerHaptic();
              guardClick(g.id, () => {
                if (isToday) {
                  if (count > 0) decrementGoal(g.id); else incrementGoal(g.id);
                } else {
                  toggleGoalForDay(day, g.id);
                }
              });
            };
            const logStep = () => { triggerHaptic(); incrementGoal(g.id); };

            const rowContent = (
              <>
                <AppIcon iconKey={g.icon} emojiFallback={g.emoji} className="goal-row-icon" />
                <div className="goal-row-info">
                  <div className="goal-row-name">{g.name}</div>
                  <div className="goal-row-pts">+{g.pts}</div>
                </div>
              </>
            );

            return (
              <div key={g.id} className={`goal-row ${done ? 'done' : ''}`}>
                {stepperStarted ? (
                  <div className="goal-row-box">{rowContent}</div>
                ) : isStepper ? (
                  <div
                    className="goal-row-box goal-row-box-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={logStep}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        logStep();
                      }
                    }}
                    aria-label={`Log ${g.name}`}
                  >
                    {rowContent}
                  </div>
                ) : (
                  <div
                    className="goal-row-box goal-row-box-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={toggleCheck}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleCheck();
                      }
                    }}
                    aria-pressed={done}
                    aria-label={done ? `${g.name}, done. Tap to undo.` : `${g.name}. Tap to complete.`}
                  >
                    {rowContent}
                  </div>
                )}
                {stepperStarted ? (
                  <div className="gtile-stepper goal-row-stepper">
                    <button
                      type="button"
                      className="gstep-btn"
                      onClick={() => { triggerHaptic(); decrementGoal(g.id); }}
                      aria-label={`Undo ${g.name}`}
                    >−</button>
                    <span className="gstep-count">{count}/{target}</span>
                    <button
                      type="button"
                      className="gstep-btn"
                      onClick={logStep}
                      aria-label={`Complete ${g.name}`}
                    >+</button>
                  </div>
                ) : isStepper ? null : (
                  <button
                    type="button"
                    className={`goal-row-check ${done ? 'done' : ''}`}
                    onClick={toggleCheck}
                    aria-pressed={done}
                    aria-label={done ? `${g.name}, done. Tap to undo.` : `${g.name}. Tap to complete.`}
                  >
                    <FontAwesomeIcon icon={done ? faRotateLeft : faCheck} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </CollapsibleCard>
  );
}

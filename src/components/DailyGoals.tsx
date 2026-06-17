import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faListCheck, faMoon } from '@fortawesome/free-solid-svg-icons';
import { useGrubClub } from '../state/GrubClubContext';

export function DailyGoals() {
  const { state, incrementGoal, decrementGoal } = useGrubClub();
  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  const goalCounts = state.todayGoalCounts || {};
  const completedGoals = dailyGoals.filter((g) => (goalCounts[g.id] || 0) >= (g.target || 1)).length;

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <div className="goal-card-title"><FontAwesomeIcon icon={faListCheck} /> Daily Goals</div>
        {dailyGoals.length > 0 && (
          <div className="goal-progress-badge">{completedGoals}/{dailyGoals.length} done</div>
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
        <div>
          {dailyGoals.map((g) => {
            const target = g.target || 1;
            const count = goalCounts[g.id] || 0;
            const done = count >= target;
            return (
              <div
                key={g.id}
                className={`goal-item ${done ? 'checked' : ''}`}
              >
                <div className="goal-emoji">{g.emoji}</div>
                <div className="goal-info">
                  <div className="goal-name">{g.name}</div>
                </div>
                <div className="pts-badge">+{g.pts}</div>
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
          })}
        </div>
      )}
    </div>
  );
}

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faListCheck } from '@fortawesome/free-solid-svg-icons';
import { useGrubClub } from '../state/GrubClubContext';

export function OtherGoals() {
  const { state, incrementGoal, decrementGoal } = useGrubClub();
  const otherGoals = state.goals.filter((g) => g.isDaily === false);

  if (otherGoals.length === 0) return null;

  const goalCounts = state.todayGoalCounts || {};
  const completed = otherGoals.filter((g) => (goalCounts[g.id] || 0) >= (g.target || 1)).length;

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <div className="goal-card-title"><FontAwesomeIcon icon={faListCheck} /> Other Goals</div>
        <div className="goal-progress-badge">{completed}/{otherGoals.length} done</div>
      </div>
      <div>
        {otherGoals.map((g) => {
          const target = g.target || 1;
          const count = goalCounts[g.id] || 0;
          const done = count >= target;
          return (
            <div key={g.id} className={`goal-item ${done ? 'checked' : ''}`}>
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
    </div>
  );
}

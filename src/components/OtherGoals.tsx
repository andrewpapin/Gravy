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
        <div className="goal-card-title">
          <span className="card-title-icon icon-coral"><FontAwesomeIcon icon={faListCheck} /></span> Other Goals
        </div>
        <div className="goal-progress-badge">{completed}/{otherGoals.length} done</div>
      </div>
      <div className="goal-grid">
        {otherGoals.map((g) => {
          const target = g.target || 1;
          const count = goalCounts[g.id] || 0;
          const done = count >= target;

          if (target === 1) {
            return (
              <button
                key={g.id}
                type="button"
                className={`goal-tile ${done ? 'checked' : ''}`}
                onClick={() => (count > 0 ? decrementGoal(g.id) : incrementGoal(g.id))}
                aria-pressed={done}
                aria-label={done ? `${g.name}, done. Tap to undo.` : `${g.name}. Tap to complete.`}
              >
                <div className="goal-tile-top">
                  <span className="goal-tile-emoji" aria-hidden="true">{g.emoji}</span>
                  <span className="pts-badge">+{g.pts}</span>
                </div>
                <div className="goal-tile-name">{g.name}</div>
              </button>
            );
          }

          return (
            <div key={g.id} className={`goal-tile ${done ? 'checked' : ''}`}>
              <div className="goal-tile-top">
                <span className="goal-tile-emoji" aria-hidden="true">{g.emoji}</span>
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
        })}
      </div>
    </div>
  );
}

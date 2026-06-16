import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUtensils, faMoon } from '@fortawesome/free-solid-svg-icons';
import { FOODS } from '../data/foods';
import { useGrubClub } from '../state/GrubClubContext';

export function TodaysGoals() {
  const { state, logFood, removeFood, incrementGoal, decrementGoal } = useGrubClub();
  const eatenCount = Object.values(state.todayFoodCounts).filter((v) => v > 0).length;
  const allEaten = eatenCount === FOODS.length;

  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  const goalCounts = state.todayGoalCounts || {};
  const completedGoals = dailyGoals.filter((g) => (goalCounts[g.id] || 0) >= (g.target || 1)).length;

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <div className="goal-card-title"><FontAwesomeIcon icon={faUtensils} /> Today's Goals</div>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--sage)' }}>
          {allEaten ? '🎉 Full Tray Bonus!' : `${eatenCount}/5 eaten`}
        </div>
      </div>

      {/* Food tray grid */}
      <div className="tray-grid">
        {FOODS.map((f) => {
          const count = state.todayFoodCounts[f.id] || 0;
          return (
            <div
              key={f.id}
              className={`food-tile ${count > 0 ? 'checked' : ''}`}
              aria-label={`${f.label}${count > 0 ? `, logged ${count}` : ''}`}
            >
              <div className="food-emoji">{f.emoji}</div>
              <div className="food-label">{f.label}</div>
              <div className="food-stepper">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => removeFood(f.id)}
                  disabled={count === 0}
                  aria-label={`Remove one ${f.label}`}
                >−</button>
                <span className="stepper-count">{count}</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => logFood(f.id)}
                  aria-label={`Add one ${f.label}`}
                >+</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider between tray and daily goals */}
      <div className="todays-goals-divider" />

      {/* Daily goals list */}
      <div className="flex-between" style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--dark)' }}>
          Daily Goals
        </div>
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
                    disabled={done}
                    aria-label={`Complete ${g.name}`}
                  >+</button>
                </div>
                <div className="goal-emoji">{g.emoji}</div>
                <div className="goal-info">
                  <div className="goal-name">{g.name}</div>
                </div>
                <div className="pts-badge">+{g.pts}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

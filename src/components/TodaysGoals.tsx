import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUtensils, faMoon } from '@fortawesome/free-solid-svg-icons';
import { FOODS } from '../data/foods';
import { useGrubClub } from '../state/GrubClubContext';

export function TodaysGoals() {
  const { state, logFood, toggleGoal } = useGrubClub();
  const eatenCount = Object.values(state.todayFoodCounts).filter((v) => v > 0).length;
  const allEaten = eatenCount === FOODS.length;

  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  const completedGoals = dailyGoals.filter((g) => state.todayGoals.includes(g.id)).length;

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
            <button
              key={f.id}
              type="button"
              className={`food-tile ${count > 0 ? 'checked' : ''}`}
              onClick={() => logFood(f.id)}
              aria-label={`Log ${f.label}${count > 0 ? ` (logged ${count} time${count > 1 ? 's' : ''})` : ''}`}
            >
              {count > 1 && <div className="food-count-badge">{count}</div>}
              <div className="food-emoji">{f.emoji}</div>
              <div className="food-label">{f.label}</div>
            </button>
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
            const checked = state.todayGoals.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                className={`goal-item ${checked ? 'checked' : ''}`}
                onClick={() => toggleGoal(g.id)}
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
      )}
    </div>
  );
}

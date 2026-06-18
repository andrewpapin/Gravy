import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUtensils } from '@fortawesome/free-solid-svg-icons';
import { FOODS } from '../data/foods';
import { useGrubClub } from '../state/GrubClubContext';

export function FoodTray() {
  const { state, logFood, removeFood } = useGrubClub();
  const eatenCount = Object.values(state.todayFoodCounts).filter((v) => v > 0).length;
  const allEaten = eatenCount === FOODS.length;

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <div className="goal-card-title">
          <span className="card-title-icon icon-sage"><FontAwesomeIcon icon={faUtensils} /></span> Today's Food
        </div>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--sage)' }}>
          {allEaten ? '🎉 Full Tray Bonus!' : `${eatenCount}/5 eaten`}
        </div>
      </div>

      <div className="tray-grid">
        {FOODS.map((f) => {
          const count = state.todayFoodCounts[f.id] || 0;
          return (
            <button
              key={f.id}
              type="button"
              className={`food-tile ${count > 0 ? 'checked' : ''}`}
              onClick={() => (count > 0 ? removeFood(f.id) : logFood(f.id))}
              aria-label={count > 0 ? `${f.label}, logged. Tap to undo.` : `${f.label}. Tap to log.`}
            >
              <div className="food-emoji" aria-hidden="true">{f.emoji}</div>
              <div className="food-label" aria-hidden="true">{f.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

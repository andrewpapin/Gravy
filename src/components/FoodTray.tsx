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
        <div className="goal-card-title"><FontAwesomeIcon icon={faUtensils} /> Today's Food</div>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--sage)' }}>
          {allEaten ? '🎉 Full Tray Bonus!' : `${eatenCount}/5 eaten`}
        </div>
      </div>

      <div className="tray-grid">
        {FOODS.map((f) => {
          const count = state.todayFoodCounts[f.id] || 0;
          return (
            <div key={f.id} className="tray-tile-wrap">
              <button
                type="button"
                className={`food-tile ${count > 0 ? 'checked' : ''}`}
                onClick={() => logFood(f.id)}
                aria-label={`${f.label}${count > 0 ? `, logged ${count}` : ''}. Tap to add one.`}
              >
                {count > 1 && <span className="food-count-badge" aria-hidden="true">{count}</span>}
                <div className="food-emoji" aria-hidden="true">{f.emoji}</div>
                <div className="food-label" aria-hidden="true">{f.label}</div>
              </button>
              <button
                type="button"
                className="food-remove-btn"
                style={{ visibility: count > 0 ? 'visible' : 'hidden' }}
                onClick={() => removeFood(f.id)}
                aria-label={`Remove one ${f.label}`}
              >−</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

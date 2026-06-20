import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faCheck } from '@fortawesome/free-solid-svg-icons';
import { FOODS } from '../data/foods';
import { AppIcon } from './AppIcon';
import { useGravy } from '../state/GravyContext';

export function FoodTray() {
  const { state, logFood, removeFood } = useGravy();
  const eatenCount = Object.values(state.todayFoodCounts).filter((v) => v > 0).length;
  const allEaten = eatenCount === FOODS.length;

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <div className="goal-card-title">Food Goals</div>
        <div className={`goal-progress-badge ${allEaten ? 'done' : ''}`}>{eatenCount}/{FOODS.length} done</div>
      </div>
      {allEaten && (
        <div className="tray-progress-bonus" style={{ marginBottom: 12 }}>
          <FontAwesomeIcon icon={faStar} aria-hidden="true" /> Full Tray Bonus!
        </div>
      )}

      <div className="tray-grid">
        {FOODS.map((f) => {
          const count = state.todayFoodCounts[f.id] || 0;
          const logged = count > 0;
          return (
            <button
              key={f.id}
              type="button"
              className={`food-tile ${logged ? 'checked' : ''}`}
              onClick={() => (logged ? removeFood(f.id) : logFood(f.id))}
              aria-label={logged ? `${f.label}, logged. Tap to undo.` : `${f.label}. Tap to log.`}
            >
              {logged && (
                <span className="food-check-badge" aria-hidden="true">
                  <FontAwesomeIcon icon={faCheck} />
                </span>
              )}
              <AppIcon iconKey={f.icon} emojiFallback={f.emoji} className="food-emoji" />
              <div className="food-label" aria-hidden="true">{f.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

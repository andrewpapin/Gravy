import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUtensils, faStar, faCheck } from '@fortawesome/free-solid-svg-icons';
import { FOODS } from '../data/foods';
import { AppIcon } from './AppIcon';
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
        {allEaten ? (
          <div className="tray-progress-bonus"><FontAwesomeIcon icon={faStar} aria-hidden="true" /> Full Tray Bonus!</div>
        ) : (
          <div className="progress-pips" role="img" aria-label={`${eatenCount} of ${FOODS.length} foods logged`}>
            {FOODS.map((f) => (
              <span
                key={f.id}
                className={`progress-pip ${(state.todayFoodCounts[f.id] || 0) > 0 ? 'filled' : ''}`}
                aria-hidden="true"
              />
            ))}
          </div>
        )}
      </div>

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

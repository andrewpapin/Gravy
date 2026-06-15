import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUtensils } from '@fortawesome/free-solid-svg-icons';
import { FOODS } from '../data/foods';
import { useGrubClub } from '../state/GrubClubContext';

export function FoodTray() {
  const { state, logFood } = useGrubClub();
  const eatenCount = Object.values(state.todayFoodCounts).filter((v) => v > 0).length;
  const all = eatenCount === FOODS.length;

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <div className="card-title mb-0"><FontAwesomeIcon icon={faUtensils} /> Today's Tray</div>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--orange)' }}>
          {all ? '🎉 Full Tray Bonus!' : `${eatenCount}/5 eaten`}
        </div>
      </div>
      <div className="tray-grid">
        {FOODS.map((f) => {
          const count = state.todayFoodCounts[f.id] || 0;
          return (
            <div
              key={f.id}
              className={`food-tile ${count > 0 ? 'checked' : ''}`}
              onClick={() => logFood(f.id)}
            >
              {count > 1 && <div className="food-count-badge">{count}</div>}
              <div className="food-emoji">{f.emoji}</div>
              <div className="food-label">{f.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

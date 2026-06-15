import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUtensils } from '@fortawesome/free-solid-svg-icons';
import { FOODS } from '../data/foods';
import { useGrubClub } from '../state/GrubClubContext';

export function FoodTray() {
  const { state, toggleFood } = useGrubClub();
  const all = FOODS.every((f) => state.todayFoods.includes(f.id));

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <div className="card-title mb-0"><FontAwesomeIcon icon={faUtensils} /> Today's Tray</div>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--orange)' }}>
          {all ? '🎉 Full Tray Bonus!' : `${state.todayFoods.length}/5 eaten`}
        </div>
      </div>
      <div className="tray-grid">
        {FOODS.map((f) => (
          <div
            key={f.id}
            className={`food-tile ${state.todayFoods.includes(f.id) ? 'checked' : ''}`}
            onClick={() => toggleFood(f.id)}
          >
            <div className="food-emoji">{f.emoji}</div>
            <div className="food-label">{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { AppIcon } from '../AppIcon';
import { FOODS } from '../../data/foods';

export function PointsPanel() {
  const { state, saveSetting, saveFoodPts } = useGravy();
  const [foodPts, setFoodPts] = useState<Record<string, string>>(() =>
    Object.fromEntries(FOODS.map((f) => [f.id, String(state.settings.foodPtsByItem[f.id] ?? 10)])),
  );
  const [bonusPts, setBonusPts] = useState(String(state.settings.bonusPts));
  const [savedField, setSavedField] = useState<string | null>(null);
  const savedTimerRef = useRef<number | null>(null);

  const flashSaved = (field: string) => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSavedField(field);
    savedTimerRef.current = window.setTimeout(() => setSavedField(null), 1400);
  };

  return (
    <div>
      <div className="section-label">Food Tray Points</div>
      {FOODS.map((food) => (
        <div className="settings-row" key={food.id}>
          <div>
            <div className="settings-label">
              <span style={{ marginRight: 6 }}>
                <AppIcon iconKey={food.icon} emojiFallback={food.emoji} className="parent-item-emoji" />
              </span>
              {food.label}
              {savedField === food.id && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
            </div>
            <div className="settings-sub">Awarded when {state.settings.childName} taps {food.label.toLowerCase()}</div>
          </div>
          <input
            className="settings-input-compact"
            type="number"
            min={1}
            max={100}
            value={foodPts[food.id] ?? ''}
            onChange={(e) => setFoodPts((prev) => ({ ...prev, [food.id]: e.target.value }))}
            onBlur={(e) => {
              const clamped = Math.max(1, parseInt(e.target.value) || 1);
              setFoodPts((prev) => ({ ...prev, [food.id]: String(clamped) }));
              saveFoodPts(food.id, e.target.value);
              flashSaved(food.id);
            }}
          />
        </div>
      ))}
      <div className="settings-row">
        <div>
          <div className="settings-label">
            Full tray bonus
            {savedField === 'bonusPts' && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
          </div>
          <div className="settings-sub">Bonus for eating all 5 food groups</div>
        </div>
        <input
          className="settings-input-compact"
          type="number"
          min={0}
          max={500}
          value={bonusPts}
          onChange={(e) => setBonusPts(e.target.value)}
          onBlur={(e) => {
            const clamped = Math.max(0, parseInt(e.target.value) || 0);
            setBonusPts(String(clamped));
            saveSetting('bonusPts', e.target.value);
            flashSaved('bonusPts');
          }}
        />
      </div>
    </div>
  );
}

import { useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { AppIcon } from '../AppIcon';
import { SettingsToggle } from './SettingsToggle';
import { FOODS } from '../../data/foods';
import { todayStr } from '../../state/defaultState';
import { getBaseFoodPts } from '../../state/points';
import { applyWeight, computeFoodWeights, isFoodWeighted } from '../../state/weightedPoints';

export function PointsPanel() {
  const { state, saveSetting, saveFoodPts, setFoodWeightExcluded } = useGravy();
  const weightingOn = state.settings.weightedFoodPtsEnabled;
  // One pass for the whole panel rather than a 30-day scan per food row.
  const weights = useMemo(
    () => computeFoodWeights(state, todayStr(state.settings.timezone)),
    [state],
  );
  const [foodPts, setFoodPts] = useState<Record<string, string>>(() =>
    Object.fromEntries(FOODS.map((f) => [f.id, String(getBaseFoodPts(state.settings, f.id))])),
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
      {FOODS.map((food) => {
        const base = getBaseFoodPts(state.settings, food.id);
        const weighted = isFoodWeighted(state.settings, food.id);
        const effective = weighted ? applyWeight(base, weights[food.id] ?? 1) : base;
        return (
          <div className="settings-row" key={food.id}>
            <div>
              <div className="settings-label">
                <span style={{ marginRight: 6 }}>
                  <AppIcon iconKey={food.icon} emojiFallback={food.emoji} className="parent-item-emoji" />
                </span>
                {food.label}
                {savedField === food.id && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
              </div>
              <div className="settings-sub">
                Awarded when {state.settings.childName} taps {food.label.toLowerCase()}
                {/* Only worth saying when weighting is actually changing the number. */}
                {weightingOn && (weighted
                  ? effective !== base && <> &middot; worth <strong>{effective} pts</strong> today</>
                  : <> &middot; not weighted</>)}
              </div>
            </div>
            <input
              className="settings-input-compact"
              type="number"
              min={1}
              max={100}
              aria-label={`Points for ${food.label.toLowerCase()}`}
              value={foodPts[food.id] ?? ''}
              onChange={(e) => setFoodPts((prev) => ({ ...prev, [food.id]: e.target.value }))}
              onBlur={(e) => {
                const clamped = Math.max(1, parseInt(e.target.value) || 1);
                setFoodPts((prev) => ({ ...prev, [food.id]: String(clamped) }));
                saveFoodPts(food.id, e.target.value);
                flashSaved(food.id);
              }}
            />
            {/* Hidden entirely when weighting is off, so the panel is unchanged for everyone
                who never turns the feature on. */}
            {weightingOn && (
              <SettingsToggle
                checked={weighted}
                onChange={(on) => setFoodWeightExcluded(food.id, !on)}
                label={`Weight ${food.label.toLowerCase()} points`}
              />
            )}
          </div>
        );
      })}
      <div className="settings-row">
        <div>
          <div className="settings-label">
            Full tray bonus
            {savedField === 'bonusPts' && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
          </div>
          <div className="settings-sub">Bonus for eating all {FOODS.length} food groups</div>
        </div>
        <input
          className="settings-input-compact"
          type="number"
          min={0}
          max={500}
          aria-label="Full tray bonus points"
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

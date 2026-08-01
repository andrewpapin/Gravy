import { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faCheck, faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import { FOODS } from '../data/foods';
import { AppIcon } from './AppIcon';
import { CollapsibleCard } from './CollapsibleCard';
import { useGravy } from '../state/GravyContext';
import { getDayLog } from '../state/dayLog';
import { todayStr } from '../state/defaultState';
import { getBaseFoodPts } from '../state/points';
import { applyWeight, computeFoodWeights, isFoodWeighted } from '../state/weightedPoints';
import { pressable } from '../lib/pressable';

/** Food tiles are toggles — without a short guard a fast double-tap logs then silently un-logs. */
const TOGGLE_COOLDOWN_MS = 350;

interface FoodTrayProps {
  dateStr?: string;
  locked?: boolean;
}

export function FoodTray({ dateStr, locked = false }: FoodTrayProps = {}) {
  const { state, logFood, removeFood, logFoodForDay, removeFoodForDay } = useGravy();
  const today = todayStr(state.settings.timezone);
  const day = dateStr ?? today;
  const isToday = day === today;
  const foodCounts = getDayLog(state, day, today)?.foodCounts ?? {};
  const eatenCount = Object.values(foodCounts).filter((v) => v > 0).length;
  const allEaten = eatenCount === FOODS.length;
  // Computed once for the whole tray rather than per tile — each call scans a 30-day window.
  // Keyed on the viewed day so browsing history shows what that day actually paid.
  const weights = useMemo(() => computeFoodWeights(state, day), [state, day]);

  return (
    <CollapsibleCard
      section="foodGoals"
      title="Food Goals"
      tourId="food"
      badge={<div className={`goal-progress-badge ${allEaten ? 'done' : ''}`}>{eatenCount}/{FOODS.length} done</div>}
    >
      {allEaten && (
        <div className="tray-progress-bonus" style={{ marginBottom: 12 }}>
          <FontAwesomeIcon icon={faStar} aria-hidden="true" /> Full Tray Bonus!
        </div>
      )}

      <div className="tray-grid">
        {FOODS.map((f) => {
          const count = foodCounts[f.id] || 0;
          const logged = count > 0;
          const base = getBaseFoodPts(state.settings, f.id);
          const pts = isFoodWeighted(state.settings, f.id) ? applyWeight(base, weights[f.id] ?? 1) : base;
          // Compare the rounded points, not the raw multiplier: a 1.02x weight on a 10pt food
          // still renders "+10", and an arrow pointing at an unchanged number is just confusing.
          const drift = pts > base ? 'boosted' : pts < base ? 'reduced' : '';
          return (
            <button
              key={f.id}
              type="button"
              className={`gtile ${logged ? 'checked' : ''} ${locked ? 'day-locked' : ''}`}
              disabled={locked}
              {...pressable(() => {
                if (isToday) {
                  if (logged) removeFood(f.id); else logFood(f.id);
                } else {
                  if (logged) removeFoodForDay(day, f.id); else logFoodForDay(day, f.id);
                }
              }, { disabled: locked, cooldownMs: TOGGLE_COOLDOWN_MS })}
              aria-label={
                `${f.label}, worth ${pts} points${drift ? `, ${drift}` : ''}. `
                + (logged ? 'Logged. Tap to undo.' : 'Tap to log.')
              }
            >
              <span className={`tile-pts ${drift}`} aria-hidden="true">
                +{pts}
                {drift && <FontAwesomeIcon icon={drift === 'boosted' ? faArrowUp : faArrowDown} className="tile-pts-arrow" />}
              </span>
              {logged && (
                <span className="tile-check" aria-hidden="true">
                  <FontAwesomeIcon icon={faCheck} />
                </span>
              )}
              <AppIcon iconKey={f.icon} emojiFallback={f.emoji} className="gtile-icon" />
              <div className="gtile-name" aria-hidden="true">{f.label}</div>
            </button>
          );
        })}
      </div>
    </CollapsibleCard>
  );
}

import { useGravy } from '../../state/GravyContext';
import { SettingsToggle } from './SettingsToggle';
import { FOODS } from '../../data/foods';
import { WEIGHT_MAX, WEIGHT_MIN, WEIGHT_WINDOW_DAYS } from '../../state/weightedPoints';

// The master switch for Dynamic Point Weighting. Its own Advanced Settings destination rather than
// an inline row because the mechanic needs explaining — a parent who turns this on without knowing
// what it does will see their kid's point values move on their own and switch it straight back off.
export function WeightedPointsPanel() {
  const { state, setWeightedFoodPtsEnabled } = useGravy();
  const enabled = state.settings.weightedFoodPtsEnabled;
  const excluded = FOODS.filter((f) => state.settings.weightedFoodPtsExcluded?.[f.id]);

  return (
    <div>
      <div className="section-label">Dynamic Points</div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Weight food points</div>
          <div className="settings-sub">
            Foods {state.settings.childName} rarely eats become worth more
          </div>
        </div>
        <SettingsToggle
          checked={enabled}
          onChange={setWeightedFoodPtsEnabled}
          label="Dynamic food point weighting"
        />
      </div>

      <div className="muted-note weighting-explainer">
        <p>
          Normally every food group is worth whatever you set in Game Settings &rarr; Points. With
          this on, those values flex based on the last {WEIGHT_WINDOW_DAYS} days: a food group
          {' '}{state.settings.childName} eats less often than the others is worth more, and one they
          eat every day is worth a little less. Nothing goes below {WEIGHT_MIN}&times; or above
          {' '}{WEIGHT_MAX}&times; what you set.
        </p>
        <p>
          Values update once a day, so points don&apos;t move around while
          {' '}{state.settings.childName} is using the app.
        </p>
        <p>
          You can leave individual food groups out of this in <strong>Game Settings &rarr;
          Points</strong>. Sweets start out excluded, so never eating them can&apos;t make them the
          most valuable thing on the tray.
          {excluded.length > 0 && (
            <> Currently excluded: {excluded.map((f) => f.label).join(', ')}.</>
          )}
        </p>
      </div>
    </div>
  );
}

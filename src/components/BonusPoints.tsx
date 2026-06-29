import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon } from '@fortawesome/free-solid-svg-icons';
import { AppIcon } from './AppIcon';
import { useGravy } from '../state/GravyContext';
import { getDayLog } from '../state/dayLog';
import { todayStr } from '../state/defaultState';
import { triggerHaptic } from '../lib/haptics';

interface BonusPointsProps {
  dateStr?: string;
}

export function BonusPoints({ dateStr }: BonusPointsProps = {}) {
  const { state, logBonusItem, undoBonusItem, logBonusItemForDay, undoBonusItemForDay } = useGravy();
  const today = todayStr(state.settings.timezone);
  const day = dateStr ?? today;
  const isToday = day === today;
  const bonusItems = state.goals.filter((g) => g.isDaily === false);
  const goalCounts = isToday ? (state.todayGoalCounts || {}) : (getDayLog(state, day, today)?.bonusCounts ?? {});
  const loggedCount = bonusItems.filter((g) => (goalCounts[g.id] || 0) > 0).length;
  const allLogged = bonusItems.length > 0 && loggedCount === bonusItems.length;

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <div className="goal-card-title">Bonus Points</div>
        {bonusItems.length > 0 && (
          <div className={`goal-progress-badge ${allLogged ? 'done' : ''}`}>{loggedCount}/{bonusItems.length} logged</div>
        )}
      </div>

      {bonusItems.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-emoji"><FontAwesomeIcon icon={faMoon} /></span>
          <div className="empty-state-text">
            No bonus items yet!
            <br />
            Ask a grown-up to add some.
          </div>
        </div>
      ) : (
        <div className="goal-grid">
          {bonusItems.map((g) => {
            const count = goalCounts[g.id] || 0;
            return (
              <div key={g.id} className="goal-tile">
                <div className="goal-tile-top">
                  <AppIcon iconKey={g.icon} emojiFallback={g.emoji} className="goal-tile-emoji" />
                  <span className={`pts-badge ${g.pts < 0 ? 'negative' : ''}`}>
                    {g.pts < 0 ? '−' : '+'}{Math.abs(g.pts)}
                  </span>
                </div>
                <div className="goal-tile-name">{g.name}</div>
                <div className="goal-stepper">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => {
                      triggerHaptic();
                      if (isToday) undoBonusItem(g.id); else undoBonusItemForDay(day, g.id);
                    }}
                    disabled={count === 0}
                    aria-label={`Undo ${g.name}`}
                  >−</button>
                  <span className="stepper-count">{count}</span>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => {
                      triggerHaptic();
                      if (isToday) logBonusItem(g.id); else logBonusItemForDay(day, g.id);
                    }}
                    aria-label={`Log ${g.name}`}
                  >+</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

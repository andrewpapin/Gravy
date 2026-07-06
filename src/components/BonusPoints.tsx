import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon } from '@fortawesome/free-solid-svg-icons';
import { AppIcon } from './AppIcon';
import { CollapsibleCard } from './CollapsibleCard';
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
    <CollapsibleCard
      section="bonusPoints"
      title="Bonus Points"
      badge={bonusItems.length > 0 && (
        <div className={`goal-progress-badge ${allLogged ? 'done' : ''}`}>{loggedCount}/{bonusItems.length} logged</div>
      )}
    >
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
        <div className="goal-rows">
          {bonusItems.map((g) => {
            const count = goalCounts[g.id] || 0;
            const logItem = () => {
              triggerHaptic();
              if (isToday) logBonusItem(g.id); else logBonusItemForDay(day, g.id);
            };
            return (
              <div key={g.id} className="goal-row">
                <div
                  className="goal-row-box goal-row-box-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={logItem}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      logItem();
                    }
                  }}
                  aria-label={`Log ${g.name}`}
                >
                  <AppIcon iconKey={g.icon} emojiFallback={g.emoji} className="goal-row-icon" />
                  <div className="goal-row-info">
                    <div className="goal-row-name">{g.name}</div>
                    <div className={`goal-row-pts ${g.pts < 0 ? 'negative' : ''}`}>
                      {g.pts < 0 ? '−' : '+'}{Math.abs(g.pts)}
                    </div>
                  </div>
                </div>
                <div className="gtile-stepper goal-row-stepper">
                  <button
                    type="button"
                    className="gstep-btn"
                    onClick={() => {
                      triggerHaptic();
                      if (isToday) undoBonusItem(g.id); else undoBonusItemForDay(day, g.id);
                    }}
                    disabled={count === 0}
                    aria-label={`Undo ${g.name}`}
                  >−</button>
                  <span className="gstep-count">{count}</span>
                  <button
                    type="button"
                    className="gstep-btn"
                    onClick={logItem}
                    aria-label={`Log ${g.name}`}
                  >+</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CollapsibleCard>
  );
}

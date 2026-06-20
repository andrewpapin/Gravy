import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faScaleBalanced, faMoon } from '@fortawesome/free-solid-svg-icons';
import { AppIcon } from './AppIcon';
import { useGravy } from '../state/GravyContext';

export function BonusPoints() {
  const { state, logBonusItem, undoBonusItem } = useGravy();
  const bonusItems = state.goals.filter((g) => g.isDaily === false);
  const goalCounts = state.todayGoalCounts || {};

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <div className="goal-card-title">
          <span className="card-title-icon icon-coral"><FontAwesomeIcon icon={faScaleBalanced} /></span> Bonus Points
        </div>
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
                    onClick={() => undoBonusItem(g.id)}
                    disabled={count === 0}
                    aria-label={`Undo ${g.name}`}
                  >−</button>
                  <span className="stepper-count">{count}</span>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => logBonusItem(g.id)}
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

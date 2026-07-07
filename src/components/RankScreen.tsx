import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faLock, faFire, faUtensils, faListCheck, faStar } from '@fortawesome/free-solid-svg-icons';
import { AppIcon } from './AppIcon';
import { Modal } from './Modal';
import { RANKS, getRank } from '../data/ranks';
import { useGravy } from '../state/GravyContext';
import { useTodaySnapshot } from '../state/useTodaySnapshot';
import { PointsHistorySection } from './stats/PointsHistorySection';
import { ActivityHeatmapSection } from './stats/ActivityHeatmapSection';
import { PersonalBestsSection } from './stats/PersonalBestsSection';
import { GoalsTrendSection } from './stats/GoalsTrendSection';
import { FavoriteFoodsSection } from './stats/FavoriteFoodsSection';
import { GamesBreakdownSection } from './stats/GamesBreakdownSection';
import { RewardsHistorySection } from './stats/RewardsHistorySection';

interface RankScreenProps {
  open: boolean;
  onClose: () => void;
}

export function RankScreen({ open, onClose }: RankScreenProps) {
  const { state } = useGravy();
  const { foodDone, dailyGoals, goalsAllDone } = useTodaySnapshot();
  const displayTotal = Math.max(0, state.totalPoints);
  const { index: currentIndex } = getRank(displayTotal);

  return (
    <Modal open={open} onClose={onClose} closeLabel="Close stats" title="Stats">
      <div className="rank-stats-summary" aria-label={`Food streak ${state.foodStreak}, goal streak ${state.goalStreak}, day streak ${state.streak}, mega streak ${state.megaStreak}`}>
        <span className={`rank-stats-chip ${foodDone ? 'done' : ''}`} title="Food streak">
          <FontAwesomeIcon icon={faUtensils} aria-hidden="true" /> {state.foodStreak}
        </span>
        {dailyGoals.length > 0 && (
          <span className={`rank-stats-chip ${goalsAllDone ? 'done' : ''}`} title="Goal streak">
            <FontAwesomeIcon icon={faListCheck} aria-hidden="true" /> {state.goalStreak}
          </span>
        )}
        {state.streak > 0 && (
          <span className="rank-stats-chip" title="Day streak">
            <FontAwesomeIcon icon={faFire} aria-hidden="true" /> {state.streak}
          </span>
        )}
        <span className="rank-stats-chip" title="Mega streak">
          <FontAwesomeIcon icon={faStar} aria-hidden="true" /> {state.megaStreak}
        </span>
      </div>
      <div className="rank-list">
        {RANKS.map((r, i) => {
          const achieved = i < currentIndex;
          const current = i === currentIndex;
          const locked = i > currentIndex;
          const next = RANKS[i + 1];

          return (
            <div
              key={r.name}
              className={`rank-row ${achieved ? 'rank-row--achieved' : ''} ${current ? 'rank-row--current' : ''} ${locked ? 'rank-row--locked' : ''}`}
            >
              <div className="rank-row-icon-circle">
                <AppIcon iconKey={r.icon} emojiFallback={r.emoji} className="rank-row-emoji" />
              </div>
              <div className="rank-row-info">
                <div className="rank-row-name-row">
                  <span className="rank-row-name">{r.name}</span>
                  <span className="rank-row-points">{r.min}+ pts</span>
                </div>
                {current && (
                  next ? (
                    <>
                      <div className="rank-row-bar-track">
                        <div
                          className="rank-row-bar-fill"
                          style={{ width: `${Math.min(100, Math.max(0, Math.round(((displayTotal - r.min) / (next.min - r.min)) * 100)))}%` }}
                        />
                      </div>
                      <div className="rank-row-status">{displayTotal - r.min}/{next.min - r.min} pts to next rank</div>
                    </>
                  ) : (
                    <div className="rank-row-status">MAX RANK! 👑</div>
                  )
                )}
                {achieved && (
                  <div className="rank-row-status"><FontAwesomeIcon icon={faCheck} /> Achieved</div>
                )}
                {locked && (
                  <div className="rank-row-status"><FontAwesomeIcon icon={faLock} /> {Math.max(0, r.min - displayTotal)} pts to go</div>
                )}
              </div>
            </div>
          );
        }).reverse()}
      </div>
      <PointsHistorySection />
      <ActivityHeatmapSection />
      <PersonalBestsSection />
      <GoalsTrendSection />
      <FavoriteFoodsSection />
      <GamesBreakdownSection />
      <RewardsHistorySection />
    </Modal>
  );
}

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faFire, faUtensils, faListCheck, faStar } from '@fortawesome/free-solid-svg-icons';
import { Modal } from './Modal';
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
  const { foodDone, dailyGoals, goalsAllDone, xpText, pct } = useTodaySnapshot();

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
      <div className="rank-progress-card">
        <div className="rank-progress-label">
          <FontAwesomeIcon icon={faLock} aria-hidden="true" /> Next Level
        </div>
        {pct < 100 ? (
          <>
            <div className="rank-row-bar-track">
              <div className="rank-row-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="rank-progress-status">{xpText} to next level</div>
          </>
        ) : (
          <div className="rank-progress-status">MAX LEVEL! 👑</div>
        )}
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

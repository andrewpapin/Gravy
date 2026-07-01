import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFire, faMedal, faChevronRight, faCircleInfo, faCoins, faCloudArrowUp } from '@fortawesome/free-solid-svg-icons';
import { AppIcon } from './AppIcon';
import { useGravy } from '../state/GravyContext';
import { useTodaySnapshot } from '../state/useTodaySnapshot';
import { getEnabledBadgeCount } from '../state/badges';
import { useEffect, useRef, useState } from 'react';

interface StatsCardProps {
  onOpenBadges: () => void;
  onOpenRank: () => void;
  onOpenStore?: () => void;
}

export function StatsCard({ onOpenBadges, onOpenRank, onOpenStore }: StatsCardProps) {
  const { state, householdCode, syncStatus } = useGravy();
  const { rank, xpText, pct, streakAtRisk } = useTodaySnapshot();
  const earnedCount = state.earnedBadges.length;
  const totalBadgeCount = getEnabledBadgeCount(state);
  const syncError = !!householdCode && syncStatus === 'error';
  // The internal balance can dip below zero after a large deduction; never show negative.
  const displayPoints = Math.max(0, state.points);

  const prevPointsRef = useRef(state.totalPoints);
  const [xpPulse, setXpPulse] = useState(false);
  useEffect(() => {
    if (state.totalPoints > prevPointsRef.current) {
      setXpPulse(true);
      const timer = setTimeout(() => setXpPulse(false), 500);
      prevPointsRef.current = state.totalPoints;
      return () => clearTimeout(timer);
    }
    prevPointsRef.current = state.totalPoints;
  }, [state.totalPoints]);

  return (
    <div className="stats-card">
      <div className="stats-rank">
        <button className="stats-rank-info-btn" onClick={onOpenRank} aria-label="View rank ladder and stats" type="button">
          <FontAwesomeIcon icon={faCircleInfo} />
        </button>
        <div className="stats-rank-header">
          <div className="stats-rank-icon-circle">
            <AppIcon iconKey={rank.icon} emojiFallback={rank.emoji} className="stats-rank-emoji" />
          </div>
          <div className="stats-rank-info">
            <div className="stats-rank-name-row">
              <span className="stats-rank-name">{rank.name}</span>
              <span className="stats-rank-xp">{xpText}</span>
            </div>
            <div className={`xp-bar-track ${xpPulse ? 'xp-pulse' : ''}`}>
              <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        {streakAtRisk && (
          <div className="streak-risk-nudge">
            <FontAwesomeIcon icon={faFire} /> Log something today to keep your streak going!
          </div>
        )}
      </div>
      <div className="stats-top-row">
        <button
          type="button"
          className="stats-coins-bar"
          onClick={onOpenStore}
          aria-label={`${displayPoints} points — open Reward Store`}
        >
          <span className="stats-coins-bar-label">
            <FontAwesomeIcon icon={faCoins} /> {displayPoints} Coins
            {syncError && (
              <span
                className="sync-warning-icon"
                title="Sync issue — your progress is saved here and will sync once connection is back"
                aria-label="Sync issue — progress saved locally"
                role="img"
              >
                <FontAwesomeIcon icon={faCloudArrowUp} aria-hidden="true" />
              </span>
            )}
          </span>
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
        <button className="stats-badges-bar" onClick={onOpenBadges} type="button">
          <span className="stats-badges-bar-label">
            <FontAwesomeIcon icon={faMedal} /> {earnedCount}/{totalBadgeCount} Badges
          </span>
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    </div>
  );
}

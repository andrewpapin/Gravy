import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCheck, faLock } from '@fortawesome/free-solid-svg-icons';
import { AppIcon } from './AppIcon';
import { RANKS, getRank } from '../data/ranks';
import { useGravy } from '../state/GravyContext';
import { useFocusTrap } from './useFocusTrap';

interface RankScreenProps {
  open: boolean;
  onClose: () => void;
}

export function RankScreen({ open, onClose }: RankScreenProps) {
  const { state } = useGravy();
  const displayTotal = Math.max(0, state.totalPoints);
  const { index: currentIndex } = getRank(displayTotal);
  const sheetRef = useFocusTrap<HTMLDivElement>(open, onClose);

  return (
    <div
      className={`calendar-modal-overlay ${open ? 'show' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="calendar-modal-sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-label="Rank Ladder" tabIndex={-1}>
        <div className="calendar-modal-header">
          <span className="calendar-modal-title">Rank Ladder</span>
          <button className="calendar-modal-close" onClick={onClose} aria-label="Close rank ladder" type="button">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="calendar-modal-body">
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
        </div>
      </div>
    </div>
  );
}

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore, faHourglassHalf, faStar, faLock } from '@fortawesome/free-solid-svg-icons';
import { TopBar } from './TopBar';
import { useGrubClub } from '../state/GrubClubContext';

interface StoreScreenProps {
  onEnterParent: () => void;
}

export function StoreScreen({ onEnterParent: _onEnterParent }: StoreScreenProps) {
  const { state, requestReward } = useGrubClub();
  const pendingIds = state.pendingRewards.map((r) => r.rewardId);
  const available = state.rewards.filter((r) => !pendingIds.includes(r.id));

  return (
    <div className="screen active">
      <TopBar title="Reward Store" />
      <div className="scroll-area">
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 14, textAlign: 'center' }}>
          Tap a reward to ask for it — a grown-up will need to say yes!
        </div>

        {state.rewards.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <span className="empty-state-emoji"><FontAwesomeIcon icon={faStore} /></span>
            <div className="empty-state-text">
              The store is empty!
              <br />
              Ask a grown-up to add rewards.
            </div>
          </div>
        ) : available.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <span className="empty-state-emoji"><FontAwesomeIcon icon={faHourglassHalf} /></span>
            <div className="empty-state-text">
              All rewards requested!
              <br />
              Check below for approval status.
            </div>
          </div>
        ) : (
          <div className="store-grid">
            {available.map((r) => {
              const affordable = state.points >= r.cost;
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`store-item ${!affordable ? 'unaffordable' : ''}`}
                  onClick={() => requestReward(r.id)}
                  aria-label={`${r.name}, ${r.cost} points${!affordable ? `, need ${r.cost - state.points} more` : ''}`}
                  aria-disabled={!affordable}
                >
                  {!affordable && (
                    <span className="store-lock" aria-hidden="true">
                      <FontAwesomeIcon icon={faLock} />
                    </span>
                  )}
                  <span className="store-emoji" aria-hidden="true">{r.emoji}</span>
                  <div className="store-name">{r.name}</div>
                  <div className={`store-cost ${!affordable ? 'unaffordable' : ''}`}><FontAwesomeIcon icon={faStar} aria-hidden="true" /> {r.cost}</div>
                  {!affordable && (
                    <div className="store-need-more">Need {r.cost - state.points} more</div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <div className="card-title" style={{ marginBottom: 8 }}>
            <FontAwesomeIcon icon={faHourglassHalf} /> Pending Requests
          </div>
          {state.pendingRewards.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', padding: 8 }}>
              No pending requests
            </div>
          ) : (
            <div>
              {state.pendingRewards.map((pr) => {
                const reward = state.rewards.find((r) => r.id === pr.rewardId);
                if (!reward) return null;
                return (
                  <div className="pending-item" key={pr.id}>
                    <div className="pending-item-emoji" aria-hidden="true">{reward.emoji}</div>
                    <div className="pending-item-info">
                      <div className="pending-item-name">{reward.name}</div>
                      <div className="pending-item-status">
                        <FontAwesomeIcon icon={faHourglassHalf} aria-hidden="true" /> {reward.cost} pts · Waiting for approval
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

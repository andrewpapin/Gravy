import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCartShopping, faStore, faHourglassHalf, faStar } from '@fortawesome/free-solid-svg-icons';
import { TopBar } from './TopBar';
import { useGrubClub } from '../state/GrubClubContext';

export function StoreScreen() {
  const { state, requestReward } = useGrubClub();
  const pendingIds = state.pendingRewards.map((r) => r.rewardId);

  return (
    <div className="screen active">
      <TopBar logo={<FontAwesomeIcon icon={faCartShopping} />} title="Reward Store" />
      <div className="scroll-area">
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 14, textAlign: 'center' }}>
          Tap a reward to spend your points!
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
        ) : (
          <div className="store-grid">
            {state.rewards.map((r) => {
              const affordable = state.points >= r.cost;
              const pending = pendingIds.includes(r.id);
              return (
                <div
                  key={r.id}
                  className={`store-item ${pending ? 'pending' : ''}`}
                  onClick={() => !pending && requestReward(r.id)}
                >
                  <span className="store-emoji">{r.emoji}</span>
                  <div className="store-name">{r.name}</div>
                  <div className={`store-cost ${!affordable && !pending ? 'unaffordable' : ''}`}><FontAwesomeIcon icon={faStar} /> {r.cost}</div>
                </div>
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
                  <div className="parent-item" key={pr.id}>
                    <div className="parent-item-emoji">{reward.emoji}</div>
                    <div className="parent-item-info">
                      <div className="parent-item-name">{reward.name}</div>
                      <div className="parent-item-pts" style={{ color: 'var(--orange)' }}>
                        <FontAwesomeIcon icon={faStar} /> {reward.cost} pts • Waiting for approval
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

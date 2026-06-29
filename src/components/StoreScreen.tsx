import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore, faHourglassHalf, faStar, faLock } from '@fortawesome/free-solid-svg-icons';
import { AppIcon } from './AppIcon';
import { Modal } from './Modal';
import { useGravy } from '../state/GravyContext';

interface StoreScreenProps {
  open: boolean;
  onClose: () => void;
}

export function StoreScreen({ open, onClose }: StoreScreenProps) {
  const { state, requestReward } = useGravy();
  const pendingIds = state.pendingRewards.map((r) => r.rewardId);
  const available = state.rewards.filter((r) => !pendingIds.includes(r.id));
  // Points already promised to pending requests aren't spendable on new ones.
  const reserved = state.pendingRewards.reduce((sum, pr) => {
    const r = state.rewards.find((rw) => rw.id === pr.rewardId);
    return sum + (r?.cost ?? 0);
  }, 0);
  const spendable = Math.max(0, state.points - reserved);

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="Close store"
      title="Reward Store"
    >
      <div className="muted-note" style={{ fontSize: '0.8rem', marginBottom: 14, textAlign: 'center' }}>
        Tap a reward to ask for it — a grown-up will need to say yes!
      </div>

      {state.rewards.length === 0 ? (
        <div className="empty-state empty-state--bare" style={{ gridColumn: '1 / -1' }}>
          <span className="empty-state-emoji"><FontAwesomeIcon icon={faStore} /></span>
          <div className="empty-state-text">
            The store is empty!
            <br />
            Ask a grown-up to add rewards.
          </div>
        </div>
      ) : available.length === 0 ? (
        <div className="empty-state empty-state--bare" style={{ gridColumn: '1 / -1' }}>
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
            const affordable = spendable >= r.cost;
            return (
              <button
                key={r.id}
                type="button"
                className={`store-item ${!affordable ? 'unaffordable' : ''}`}
                onClick={() => requestReward(r.id)}
                aria-label={`${r.name}, ${r.cost} points${!affordable ? `, need ${r.cost - spendable} more` : ''}`}
                aria-disabled={!affordable}
              >
                {!affordable && (
                  <span className="store-lock" aria-hidden="true">
                    <FontAwesomeIcon icon={faLock} />
                  </span>
                )}
                <AppIcon iconKey={r.icon} emojiFallback={r.emoji} className="store-emoji" />
                <div className="store-name">{r.name}</div>
                <div className={`store-cost ${!affordable ? 'unaffordable' : ''}`}><FontAwesomeIcon icon={faStar} aria-hidden="true" /> {r.cost}</div>
                {!affordable && (
                  <div className="store-need-more">Need {r.cost - spendable} more</div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div className="card-title" style={{ marginBottom: 8 }}>
          <span className="card-title-icon icon-coral"><FontAwesomeIcon icon={faHourglassHalf} /></span> Pending Requests
        </div>
        {state.pendingRewards.length === 0 ? (
          <div className="muted-note" style={{ fontSize: '0.8rem', textAlign: 'center', padding: 8 }}>
            No pending requests
          </div>
        ) : (
          <div>
            {state.pendingRewards.map((pr) => {
              const reward = state.rewards.find((r) => r.id === pr.rewardId);
              if (!reward) return null;
              return (
                <div className="pending-item" key={pr.id}>
                  <AppIcon iconKey={reward.icon} emojiFallback={reward.emoji} className="pending-item-emoji" />
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
    </Modal>
  );
}

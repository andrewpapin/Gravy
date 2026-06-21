import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faStar, faCheck, faXmark, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { AppIcon } from '../AppIcon';
import { ConfirmDialog } from '../ConfirmDialog';

export function ApprovalsPanel() {
  const { state, approveReward, declineReward } = useGravy();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  // Never surface a negative internal balance to the parent.
  const availablePoints = Math.max(0, state.points);

  const handleApprove = (prId: string, insufficient: boolean) => {
    if (insufficient) {
      setConfirmId(prId);
    } else {
      approveReward(prId);
    }
  };

  if (state.pendingRewards.length === 0) {
    return (
      <div>
        <div className="section-label">Reward Requests</div>
        <div className="empty-state" style={{ padding: '24px 0' }}>
          <span className="empty-state-emoji"><FontAwesomeIcon icon={faMoon} /></span>
          <div className="empty-state-text">No pending requests</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-label">Reward Requests</div>
      {state.pendingRewards.map((pr) => {
        const reward = state.rewards.find((r) => r.id === pr.rewardId);
        if (!reward) return null;
        const insufficient = state.points < reward.cost;
        return (
          <div className="parent-item" key={pr.id}>
            <AppIcon iconKey={reward.icon} emojiFallback={reward.emoji} className="parent-item-emoji" />
            <div className="parent-item-info">
              <div className="parent-item-name">{reward.name}</div>
              <div className="parent-item-pts"><FontAwesomeIcon icon={faStar} /> {reward.cost} pts requested</div>
              {insufficient && (
                <div className="parent-item-warning">
                  <FontAwesomeIcon icon={faTriangleExclamation} /> Only {availablePoints} pts available — approving will use all of them
                </div>
              )}
            </div>
            <div className="approve-btns">
              <button className="btn btn-sm btn-green" onClick={() => handleApprove(pr.id, insufficient)} aria-label={`Approve ${reward.name}`}>
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button className="btn btn-sm btn-pink" onClick={() => setDeclineId(pr.id)} aria-label={`Decline ${reward.name}`}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>
        );
      })}
      <ConfirmDialog
        open={confirmId !== null}
        icon={faTriangleExclamation}
        title="Not enough points"
        message={`Only ${availablePoints} pts available. Approving this reward will spend all of them. Continue?`}
        confirmLabel="Approve anyway"
        danger
        onConfirm={() => { if (confirmId) { approveReward(confirmId); } setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
      <ConfirmDialog
        open={declineId !== null}
        icon={faXmark}
        title="Decline this request?"
        message="The request will be removed. Your child can ask for it again later."
        confirmLabel="Decline"
        danger
        onConfirm={() => { if (declineId) { declineReward(declineId); } setDeclineId(null); }}
        onCancel={() => setDeclineId(null)}
      />
    </div>
  );
}

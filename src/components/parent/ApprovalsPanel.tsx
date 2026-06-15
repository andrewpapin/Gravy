import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faStar, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useGrubClub } from '../../state/GrubClubContext';

export function ApprovalsPanel() {
  const { state, approveReward, declineReward } = useGrubClub();

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
        return (
          <div className="parent-item" key={pr.id}>
            <div className="parent-item-emoji">{reward.emoji}</div>
            <div className="parent-item-info">
              <div className="parent-item-name">{reward.name}</div>
              <div className="parent-item-pts"><FontAwesomeIcon icon={faStar} /> {reward.cost} pts requested</div>
            </div>
            <div className="approve-btns">
              <button className="btn btn-sm btn-green" onClick={() => approveReward(pr.id)}>
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button className="btn btn-sm btn-pink" onClick={() => declineReward(pr.id)}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

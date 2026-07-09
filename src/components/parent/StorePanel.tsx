import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faPen, faCheck, faXmark, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { AppIcon } from '../AppIcon';
import { IconPicker } from '../IconPicker';
import { ConfirmDialog } from '../ConfirmDialog';
import type { Reward } from '../../state/types';

const DEFAULT_REWARD_ICON = 'gift';

export function StorePanel() {
  const { state, addReward, removeReward, updateReward } = useGravy();
  const [icon, setIcon] = useState(DEFAULT_REWARD_ICON);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editReward, setEditReward] = useState({ icon: '', emoji: '', name: '', cost: '' });
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  const startEdit = (r: Reward) => {
    setConfirmRemoveId(null);
    setEditingId(r.id);
    setEditReward({ icon: r.icon || '', emoji: r.emoji, name: r.name, cost: String(r.cost) });
  };

  const saveEdit = (id: number) => {
    const trimmedName = editReward.name.trim();
    if (!trimmedName) return;
    updateReward(id, {
      icon: editReward.icon || DEFAULT_REWARD_ICON,
      name: trimmedName,
      cost: parseInt(editReward.cost) || 50,
    });
    setEditingId(null);
  };

  const handleAdd = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    addReward({
      emoji: '',
      icon: icon || DEFAULT_REWARD_ICON,
      name: trimmedName,
      cost: parseInt(cost) || 50,
    });
    setIcon(DEFAULT_REWARD_ICON);
    setName('');
    setCost('');
  };

  const rewardPendingRemoval = state.rewards.find((r) => r.id === confirmRemoveId);

  return (
    <div>
      <div className="section-label">Add a Reward</div>
      <form className="input-row" onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
        <div className="input-row-fields">
          <IconPicker value={icon} onChange={setIcon} ariaLabel="Choose a reward icon" />
          <input type="text" placeholder="Reward name..." value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="input-row-controls">
          <label className="input-field-group">
            <span className="input-field-label">Cost</span>
            <input
              type="number"
              className="pts-input"
              aria-label="Cost"
              min={1}
              max={9999}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-sm btn-purple">
            Add
          </button>
        </div>
      </form>
      <div className="section-label">Current Rewards</div>
      {state.rewards.length === 0 ? (
        <div className="muted-note" style={{ fontSize: '0.8rem', padding: '12px 0' }}>
          No rewards added yet
        </div>
      ) : (
        state.rewards.map((r) =>
          editingId === r.id ? (
            <form
              className="input-row"
              key={r.id}
              onSubmit={(e) => { e.preventDefault(); saveEdit(r.id); }}
            >
              <div className="input-row-fields">
                <IconPicker
                  value={editReward.icon}
                  legacyEmoji={editReward.emoji}
                  onChange={(key) => setEditReward({ ...editReward, icon: key })}
                  ariaLabel="Choose a reward icon"
                />
                <input
                  type="text"
                  aria-label="Reward name"
                  value={editReward.name}
                  onChange={(e) => setEditReward({ ...editReward, name: e.target.value })}
                />
              </div>
              <div className="input-row-controls">
                <label className="input-field-group">
                  <span className="input-field-label">Cost</span>
                  <input
                    type="number"
                    className="pts-input"
                    aria-label="Cost"
                    min={1}
                    max={9999}
                    value={editReward.cost}
                    onChange={(e) => setEditReward({ ...editReward, cost: e.target.value })}
                  />
                </label>
                <button type="submit" className="btn btn-sm btn-purple" title="Save" aria-label="Save">
                  <FontAwesomeIcon icon={faCheck} />
                </button>
                <button type="button" className="btn btn-sm btn-pink" title="Cancel" aria-label="Cancel" onClick={() => setEditingId(null)}>
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            </form>
          ) : (
            <div className="parent-item" key={r.id}>
              <AppIcon iconKey={r.icon} emojiFallback={r.emoji} className="parent-item-emoji" />
              <div className="parent-item-info">
                <div className="parent-item-name">{r.name}</div>
                <div className="parent-item-pts"><FontAwesomeIcon icon={faStar} /> {r.cost} pts</div>
              </div>
              <button className="btn btn-sm btn-purple" title="Edit" aria-label={`Edit ${r.name}`} onClick={() => startEdit(r)}>
                <FontAwesomeIcon icon={faPen} />
              </button>
              <button className="btn btn-sm btn-pink" aria-label={`Remove ${r.name}`} onClick={() => setConfirmRemoveId(r.id)}>
                Remove
              </button>
            </div>
          )
        )
      )}

      <ConfirmDialog
        open={rewardPendingRemoval != null}
        icon={faTrashCan}
        title="Remove this reward?"
        message={rewardPendingRemoval ? `"${rewardPendingRemoval.name}" will be removed. This can't be undone.` : ''}
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          if (confirmRemoveId != null) removeReward(confirmRemoveId);
          setConfirmRemoveId(null);
        }}
        onCancel={() => setConfirmRemoveId(null)}
      />
    </div>
  );
}

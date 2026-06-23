import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faPen, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { AppIcon } from '../AppIcon';
import { IconPicker } from '../IconPicker';
import type { Reward } from '../../state/types';

const DEFAULT_REWARD_ICON = 'gift';

export function StorePanel() {
  const { state, addReward, removeReward, updateReward } = useGravy();
  const [icon, setIcon] = useState(DEFAULT_REWARD_ICON);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editReward, setEditReward] = useState({ icon: '', emoji: '', name: '', cost: '' });

  const startEdit = (r: Reward) => {
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

  return (
    <div>
      <div className="section-label">Add a Reward</div>
      <form className="input-row" onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
        <IconPicker value={icon} onChange={setIcon} ariaLabel="Choose a reward icon" />
        <input type="text" placeholder="Reward name..." value={name} onChange={(e) => setName(e.target.value)} />
        <input
          type="number"
          className="pts-input"
          placeholder="cost"
          min={1}
          max={9999}
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
        <button type="submit" className="btn btn-sm btn-purple">
          Add
        </button>
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
              <IconPicker
                value={editReward.icon}
                legacyEmoji={editReward.emoji}
                onChange={(key) => setEditReward({ ...editReward, icon: key })}
                ariaLabel="Choose a reward icon"
              />
              <input
                type="text"
                value={editReward.name}
                onChange={(e) => setEditReward({ ...editReward, name: e.target.value })}
              />
              <input
                type="number"
                className="pts-input"
                min={1}
                max={9999}
                value={editReward.cost}
                onChange={(e) => setEditReward({ ...editReward, cost: e.target.value })}
              />
              <button type="submit" className="btn btn-sm btn-purple" title="Save" aria-label="Save">
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button type="button" className="btn btn-sm btn-pink" title="Cancel" aria-label="Cancel" onClick={() => setEditingId(null)}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </form>
          ) : (
            <div className="parent-item" key={r.id}>
              <AppIcon iconKey={r.icon} emojiFallback={r.emoji} className="parent-item-emoji" />
              <div className="parent-item-info">
                <div className="parent-item-name">{r.name}</div>
                <div className="parent-item-pts"><FontAwesomeIcon icon={faStar} /> {r.cost} pts</div>
              </div>
              <button className="btn btn-sm btn-purple" title="Edit" aria-label="Edit" onClick={() => startEdit(r)}>
                <FontAwesomeIcon icon={faPen} />
              </button>
              <button className="btn btn-sm btn-pink" onClick={() => removeReward(r.id)}>
                Remove
              </button>
            </div>
          )
        )
      )}
    </div>
  );
}

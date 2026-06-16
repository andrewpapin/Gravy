import { useState } from 'react';
import { useGrubClub } from '../../state/GrubClubContext';

export function StorePanel() {
  const { state, addReward, removeReward } = useGrubClub();
  const [emoji, setEmoji] = useState('');
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');

  const handleAdd = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    addReward({
      emoji: emoji.trim() || '🎁',
      name: trimmedName,
      cost: parseInt(cost) || 50,
    });
    setEmoji('');
    setName('');
    setCost('');
  };

  return (
    <div>
      <div className="section-label">Add a Reward</div>
      <form className="input-row" onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
        <input
          type="text"
          className="emoji-input"
          placeholder="🎮"
          maxLength={2}
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
        />
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
        <div style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 700, padding: '12px 0' }}>
          No rewards added yet
        </div>
      ) : (
        state.rewards.map((r) => (
          <div className="parent-item" key={r.id}>
            <div className="parent-item-emoji">{r.emoji}</div>
            <div className="parent-item-info">
              <div className="parent-item-name">{r.name}</div>
              <div className="parent-item-pts">⭐ {r.cost} pts</div>
            </div>
            <button className="btn btn-sm btn-pink" onClick={() => removeReward(r.id)}>
              Remove
            </button>
          </div>
        ))
      )}
    </div>
  );
}

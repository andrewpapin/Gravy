import { useState } from 'react';
import { useGrubClub } from '../../state/GrubClubContext';

export function ChoresPanel() {
  const { state, addChore, removeChore } = useGrubClub();
  const [emoji, setEmoji] = useState('');
  const [name, setName] = useState('');
  const [pts, setPts] = useState('');

  const handleAdd = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    addChore({
      emoji: emoji.trim() || '✅',
      name: trimmedName,
      pts: parseInt(pts) || 10,
    });
    setEmoji('');
    setName('');
    setPts('');
  };

  return (
    <div>
      <div className="section-label">Add a Chore</div>
      <div className="input-row">
        <input
          type="text"
          placeholder="🧹"
          maxLength={2}
          style={{ width: 52, flex: 'none', textAlign: 'center', fontSize: '1.2rem' }}
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
        />
        <input type="text" placeholder="Chore name..." value={name} onChange={(e) => setName(e.target.value)} />
        <input
          type="number"
          className="pts-input"
          placeholder="pts"
          min={1}
          max={999}
          value={pts}
          onChange={(e) => setPts(e.target.value)}
        />
        <button className="btn btn-sm btn-purple" onClick={handleAdd}>
          Add
        </button>
      </div>
      <div className="section-label">Current Chores</div>
      {state.chores.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 700, padding: '12px 0' }}>
          No chores added yet
        </div>
      ) : (
        state.chores.map((c) => (
          <div className="parent-item" key={c.id}>
            <div className="parent-item-emoji">{c.emoji}</div>
            <div className="parent-item-info">
              <div className="parent-item-name">{c.name}</div>
              <div className="parent-item-pts">+{c.pts} pts</div>
            </div>
            <button className="btn btn-sm btn-pink" onClick={() => removeChore(c.id)}>
              Remove
            </button>
          </div>
        ))
      )}
    </div>
  );
}

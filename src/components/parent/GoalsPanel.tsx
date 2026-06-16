import { useState } from 'react';
import { useGrubClub } from '../../state/GrubClubContext';

export function GoalsPanel() {
  const { state, addGoal, removeGoal, updateGoal } = useGrubClub();
  const [emoji, setEmoji] = useState('');
  const [name, setName] = useState('');
  const [pts, setPts] = useState('');
  const [target, setTarget] = useState('1');
  const [isDaily, setIsDaily] = useState(true);

  const handleAdd = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    addGoal({
      emoji: emoji.trim() || '✅',
      name: trimmedName,
      pts: parseInt(pts) || 10,
      target: Math.max(1, parseInt(target) || 1),
      isDaily,
    });
    setEmoji('');
    setName('');
    setPts('');
    setTarget('1');
    setIsDaily(true);
  };

  return (
    <div>
      <div className="section-label">Add a Goal</div>
      <div className="input-row">
        <input
          type="text"
          className="emoji-input"
          placeholder="🧹"
          maxLength={2}
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
        />
        <input type="text" placeholder="Goal name..." value={name} onChange={(e) => setName(e.target.value)} />
        <input
          type="number"
          className="pts-input"
          placeholder="pts"
          min={1}
          max={999}
          value={pts}
          onChange={(e) => setPts(e.target.value)}
        />
        <input
          type="number"
          className="pts-input"
          placeholder="×"
          title="Times to complete"
          min={1}
          max={99}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <button className="btn btn-sm btn-purple" onClick={handleAdd}>
          Add
        </button>
      </div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
        <div>
          <div className="settings-label">Daily Goal</div>
          <div className="settings-sub">Resets each day and appears in "Today's Goals"</div>
        </div>
        <label className="pbadge-toggle">
          <input type="checkbox" checked={isDaily} onChange={(e) => setIsDaily(e.target.checked)} />
          <span className="pbadge-toggle-track" />
        </label>
      </div>

      <div className="section-label">Current Goals</div>
      {state.goals.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 700, padding: '12px 0' }}>
          No goals added yet
        </div>
      ) : (
        state.goals.map((g) => (
          <div className="parent-item" key={g.id}>
            <div className="parent-item-emoji">{g.emoji}</div>
            <div className="parent-item-info">
              <div className="parent-item-name">{g.name}</div>
              <div className="parent-item-pts">
                +{g.pts} pts · {g.isDaily !== false ? 'Daily' : 'One-time'}
                {(g.target || 1) > 1 ? ` · ×${g.target}` : ''}
              </div>
            </div>
            <label className="pbadge-toggle" title="Toggle daily / one-time">
              <input
                type="checkbox"
                checked={g.isDaily !== false}
                onChange={(e) => updateGoal(g.id, { isDaily: e.target.checked })}
              />
              <span className="pbadge-toggle-track" />
            </label>
            <button className="btn btn-sm btn-pink" onClick={() => removeGoal(g.id)}>
              Remove
            </button>
          </div>
        ))
      )}
    </div>
  );
}

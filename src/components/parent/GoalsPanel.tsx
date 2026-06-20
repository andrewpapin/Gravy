import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { AppIcon } from '../AppIcon';
import { IconPicker } from '../IconPicker';
import type { Goal } from '../../state/types';

const DEFAULT_GOAL_ICON = 'circleCheck';

export function GoalsPanel() {
  const { state, addGoal, removeGoal, updateGoal } = useGravy();
  const [icon, setIcon] = useState(DEFAULT_GOAL_ICON);
  const [name, setName] = useState('');
  const [pts, setPts] = useState('');
  const [target, setTarget] = useState('1');
  const [isDaily, setIsDaily] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editGoal, setEditGoal] = useState({ icon: '', emoji: '', name: '', pts: '', target: '1' });

  const startEdit = (g: Goal) => {
    setEditingId(g.id);
    setEditGoal({ icon: g.icon || '', emoji: g.emoji, name: g.name, pts: String(g.pts), target: String(g.target || 1) });
  };

  const saveEdit = (id: number) => {
    const trimmedName = editGoal.name.trim();
    if (!trimmedName) return;
    updateGoal(id, {
      icon: editGoal.icon || DEFAULT_GOAL_ICON,
      name: trimmedName,
      pts: parseInt(editGoal.pts) || 10,
      target: Math.max(1, parseInt(editGoal.target) || 1),
    });
    setEditingId(null);
  };

  const handleAdd = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    addGoal({
      emoji: '',
      icon: icon || DEFAULT_GOAL_ICON,
      name: trimmedName,
      pts: parseInt(pts) || 10,
      target: Math.max(1, parseInt(target) || 1),
      isDaily,
    });
    setIcon(DEFAULT_GOAL_ICON);
    setName('');
    setPts('');
    setTarget('1');
    setIsDaily(true);
  };

  return (
    <div>
      <div className="section-label">Add a Goal</div>
      <form className="input-row" onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
        <IconPicker value={icon} onChange={setIcon} ariaLabel="Choose a goal icon" />
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
        <button type="submit" className="btn btn-sm btn-purple">
          Add
        </button>
      </form>
      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 700, marginTop: -8, marginBottom: 'var(--space-md)' }}>
        The × field sets how many times a goal must be done per day (e.g. "Drink water" ×3)
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
        state.goals.map((g) =>
          editingId === g.id ? (
            <form
              className="input-row"
              key={g.id}
              onSubmit={(e) => { e.preventDefault(); saveEdit(g.id); }}
            >
              <IconPicker
                value={editGoal.icon}
                legacyEmoji={editGoal.emoji}
                onChange={(key) => setEditGoal({ ...editGoal, icon: key })}
                ariaLabel="Choose a goal icon"
              />
              <input
                type="text"
                value={editGoal.name}
                onChange={(e) => setEditGoal({ ...editGoal, name: e.target.value })}
              />
              <input
                type="number"
                className="pts-input"
                min={1}
                max={999}
                value={editGoal.pts}
                onChange={(e) => setEditGoal({ ...editGoal, pts: e.target.value })}
              />
              <input
                type="number"
                className="pts-input"
                min={1}
                max={99}
                value={editGoal.target}
                onChange={(e) => setEditGoal({ ...editGoal, target: e.target.value })}
              />
              <button type="submit" className="btn btn-sm btn-purple" title="Save">
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button type="button" className="btn btn-sm btn-pink" title="Cancel" onClick={() => setEditingId(null)}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </form>
          ) : (
            <div className="parent-item" key={g.id}>
              <AppIcon iconKey={g.icon} emojiFallback={g.emoji} className="parent-item-emoji" />
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
              <button className="btn btn-sm btn-purple" title="Edit" onClick={() => startEdit(g)}>
                <FontAwesomeIcon icon={faPen} />
              </button>
              <button className="btn btn-sm btn-pink" onClick={() => removeGoal(g.id)}>
                Remove
              </button>
            </div>
          )
        )
      )}
    </div>
  );
}

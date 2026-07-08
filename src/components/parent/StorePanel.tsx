import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { AppIcon } from '../AppIcon';
import { IconPicker } from '../IconPicker';
import { ConfirmDialog } from '../ConfirmDialog';
import { SwipeToDeleteRow } from '../SwipeToDeleteRow';
import type { Reward } from '../../state/types';

const DEFAULT_REWARD_ICON = 'gift';

function clampCost(raw: string): string {
  return String(Math.max(1, Math.min(9999, parseInt(raw, 10) || 1)));
}

export function StorePanel() {
  const { state, addReward, removeReward, updateReward } = useGravy();
  const [icon, setIcon] = useState(DEFAULT_REWARD_ICON);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editReward, setEditReward] = useState({ icon: '', emoji: '', name: '' });
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [costInputs, setCostInputs] = useState<Record<number, string>>({});
  const [savedField, setSavedField] = useState<number | null>(null);
  const savedTimerRef = useRef<number | null>(null);
  const [openRowId, setOpenRowId] = useState<number | null>(null);

  const flashSaved = (id: number) => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSavedField(id);
    savedTimerRef.current = window.setTimeout(() => setSavedField(null), 1400);
  };

  const startEdit = (r: Reward) => {
    setConfirmRemoveId(null);
    setEditingId(r.id);
    setEditReward({ icon: r.icon || '', emoji: r.emoji, name: r.name });
  };

  const saveEdit = (id: number) => {
    const trimmedName = editReward.name.trim();
    if (!trimmedName) return;
    updateReward(id, {
      icon: editReward.icon || DEFAULT_REWARD_ICON,
      name: trimmedName,
    });
    setEditingId(null);
  };

  const saveCost = (r: Reward, raw: string) => {
    const clamped = clampCost(raw);
    setCostInputs((prev) => ({ ...prev, [r.id]: clamped }));
    updateReward(r.id, { cost: parseInt(clamped, 10) });
    flashSaved(r.id);
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
                <button type="submit" className="btn btn-sm btn-purple" title="Save" aria-label="Save">
                  <FontAwesomeIcon icon={faCheck} />
                </button>
                <button type="button" className="btn btn-sm btn-pink" title="Cancel" aria-label="Cancel" onClick={() => setEditingId(null)}>
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            </form>
          ) : (
            <SwipeToDeleteRow
              key={r.id}
              isOpen={openRowId === r.id}
              onOpenChange={(open) => setOpenRowId(open ? r.id : null)}
              onDelete={() => setConfirmRemoveId(r.id)}
              removeLabel={`Remove ${r.name}`}
            >
              <button
                type="button"
                className="settings-row-edit-trigger"
                aria-label={`Edit ${r.name}`}
                onClick={() => startEdit(r)}
              >
                <span style={{ marginRight: 6 }}>
                  <AppIcon iconKey={r.icon} emojiFallback={r.emoji} className="parent-item-emoji" />
                </span>
                <span style={{ minWidth: 0 }}>
                  <div className="settings-label">
                    {r.name}
                    {savedField === r.id && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
                  </div>
                </span>
              </button>
              <input
                className="settings-input-compact"
                type="number"
                min={1}
                max={9999}
                value={costInputs[r.id] ?? String(r.cost)}
                onChange={(e) => setCostInputs((prev) => ({ ...prev, [r.id]: e.target.value }))}
                onBlur={(e) => saveCost(r, e.target.value)}
              />
            </SwipeToDeleteRow>
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

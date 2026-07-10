import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { AppIcon } from '../AppIcon';
import { IconPicker } from '../IconPicker';
import { Modal } from '../Modal';
import type { Reward } from '../../state/types';

const DEFAULT_REWARD_ICON = 'gift';

function clampCost(raw: string): string {
  return String(Math.max(1, Math.min(9999, parseInt(raw, 10) || 1)));
}

type DrawerMode = { id: number } | 'new' | null;

interface RewardFormState {
  icon: string;
  emoji: string;
  name: string;
  cost: string;
}

const EMPTY_FORM: RewardFormState = { icon: DEFAULT_REWARD_ICON, emoji: '', name: '', cost: '' };

export function StorePanel() {
  const { state, addReward, removeReward, updateReward } = useGravy();
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [form, setForm] = useState<RewardFormState>(EMPTY_FORM);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setConfirmingDelete(false);
    setDrawerMode('new');
  };

  const openEdit = (r: Reward) => {
    setForm({ icon: r.icon || '', emoji: r.emoji, name: r.name, cost: String(r.cost) });
    setConfirmingDelete(false);
    setDrawerMode({ id: r.id });
  };

  const closeDrawer = () => {
    setDrawerMode(null);
    setConfirmingDelete(false);
  };

  const handleSave = () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) return;
    const cost = parseInt(form.cost, 10) || 50;
    if (drawerMode === 'new') {
      addReward({ emoji: '', icon: form.icon || DEFAULT_REWARD_ICON, name: trimmedName, cost });
    } else if (drawerMode) {
      updateReward(drawerMode.id, { icon: form.icon || DEFAULT_REWARD_ICON, name: trimmedName, cost });
    }
    closeDrawer();
  };

  const handleDelete = () => {
    if (drawerMode && drawerMode !== 'new') removeReward(drawerMode.id);
    closeDrawer();
  };

  const isNew = drawerMode === 'new';

  return (
    <div>
      <button type="button" className="btn btn-sm btn-purple" onClick={openAdd}>
        <FontAwesomeIcon icon={faPlus} /> Add a Reward
      </button>

      <div className="section-label mt-8">Current Rewards</div>
      {state.rewards.length === 0 ? (
        <div className="muted-note" style={{ fontSize: '0.8rem', padding: '12px 0' }}>
          No rewards added yet
        </div>
      ) : (
        state.rewards.map((r) => (
          <div className="settings-row" key={r.id}>
            <span style={{ marginRight: 6 }}>
              <AppIcon iconKey={r.icon} emojiFallback={r.emoji} className="parent-item-emoji" />
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <div className="settings-label">{r.name}</div>
              <div className="settings-sub">{r.cost} pts</div>
            </span>
            <button
              type="button"
              className="settings-row-edit-btn"
              aria-label={`Edit ${r.name}`}
              onClick={() => openEdit(r)}
            >
              <FontAwesomeIcon icon={faPenToSquare} />
            </button>
          </div>
        ))
      )}

      <Modal
        open={drawerMode != null}
        onClose={closeDrawer}
        closeLabel={isNew ? 'Close add reward' : 'Close edit reward'}
        overlayClassName="item-edit-drawer-overlay"
        title={isNew ? 'Add a Reward' : 'Edit Reward'}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="input-row">
            <div className="input-row-fields">
              <IconPicker
                value={form.icon}
                legacyEmoji={form.emoji}
                onChange={(key) => setForm((f) => ({ ...f, icon: key }))}
                ariaLabel="Choose a reward icon"
              />
              <input
                type="text"
                aria-label="Reward name"
                placeholder="Reward name..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                  value={form.cost}
                  onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                  onBlur={(e) => setForm((f) => ({ ...f, cost: clampCost(e.target.value) }))}
                />
              </label>
            </div>
          </div>

          {!confirmingDelete ? (
            <>
              <div className="confirm-dialog-btns">
                <button type="button" className="btn btn-sm btn-ghost" onClick={closeDrawer}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-sm btn-purple">
                  {isNew ? 'Add' : 'Save'}
                </button>
              </div>
              {!isNew && (
                <button
                  type="button"
                  className="goal-form-delete-link"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <FontAwesomeIcon icon={faTrashCan} /> Delete Reward
                </button>
              )}
            </>
          ) : (
            <div className="profile-confirm-delete">
              <span>Delete &quot;{form.name}&quot;? This can&apos;t be undone.</span>
              <div className="profile-confirm-actions">
                <button type="button" className="btn btn-sm btn-pink" onClick={handleDelete}>
                  Delete
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}

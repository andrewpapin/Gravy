import { useState, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { AppIcon } from '../AppIcon';
import { IconPicker } from '../IconPicker';
import { Modal } from '../Modal';
import type { Goal } from '../../state/types';

const DEFAULT_GOAL_ICON = 'circleCheck';

function clampPts(raw: string, isDaily: boolean): string {
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) return '10';
  const min = isDaily ? 1 : -999;
  return String(Math.max(min, Math.min(999, parsed)));
}

function clampTarget(raw: string): string {
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) return '1';
  return String(Math.max(1, Math.min(99, parsed)));
}

interface GoalFormFieldsProps {
  icon: string;
  legacyEmoji?: string;
  onIconChange: (key: string) => void;
  name: string;
  namePlaceholder?: string;
  onNameChange: (name: string) => void;
  pts: string;
  ptsPlaceholder?: string;
  onPtsChange: (pts: string) => void;
  showPtsField?: boolean;
  isDaily: boolean;
  target: string;
  onTargetChange: (target: string) => void;
  children?: ReactNode;
}

// Shared by the add-goal drawer and each goal's edit drawer — both collect the same
// icon/name/points/target fields, just with different placeholders. Points/target are
// normalized on blur so what will be saved is visible before submit, rather than a
// blank/invalid value silently becoming a default.
function GoalFormFields({
  icon, legacyEmoji, onIconChange, name, namePlaceholder, onNameChange,
  pts, ptsPlaceholder, onPtsChange, showPtsField = true, isDaily, target, onTargetChange, children,
}: GoalFormFieldsProps) {
  return (
    <div className="input-row">
      <div className="input-row-fields">
        <IconPicker value={icon} legacyEmoji={legacyEmoji} onChange={onIconChange} ariaLabel="Choose a goal icon" />
        <input
          type="text"
          aria-label="Goal name"
          placeholder={namePlaceholder}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>
      <div className="input-row-controls">
        {showPtsField && (
          <label className="input-field-group">
            <span className="input-field-label">{isDaily ? 'Points per day' : '± Points'}</span>
            <input
              type="number"
              className="pts-input"
              aria-label={isDaily ? 'Points' : 'Points (± for bonus/deduction)'}
              placeholder={ptsPlaceholder}
              min={isDaily ? 1 : -999}
              max={999}
              value={pts}
              onChange={(e) => onPtsChange(e.target.value)}
              onBlur={(e) => onPtsChange(clampPts(e.target.value, isDaily))}
            />
          </label>
        )}
        {isDaily && (
          <label className="input-field-group">
            <span className="input-field-label">Times per day</span>
            <input
              type="number"
              className="pts-input"
              aria-label="Times to complete per day"
              title="Times to complete"
              min={1}
              max={99}
              value={target}
              onChange={(e) => onTargetChange(e.target.value)}
              onBlur={(e) => onTargetChange(clampTarget(e.target.value))}
            />
          </label>
        )}
        {children}
      </div>
    </div>
  );
}

interface GoalsPanelProps {
  filter: 'daily' | 'bonus';
}

type DrawerMode = { id: number } | 'new' | null;

interface GoalFormState {
  icon: string;
  emoji: string;
  name: string;
  pts: string;
  target: string;
}

const EMPTY_FORM: GoalFormState = { icon: DEFAULT_GOAL_ICON, emoji: '', name: '', pts: '', target: '1' };

export function GoalsPanel({ filter }: GoalsPanelProps) {
  const isDaily = filter === 'daily';
  const { state, addGoal, removeGoal, updateGoal } = useGravy();
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [form, setForm] = useState<GoalFormState>(EMPTY_FORM);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setConfirmingDelete(false);
    setDrawerMode('new');
  };

  const openEdit = (g: Goal) => {
    setForm({
      icon: g.icon || '',
      emoji: g.emoji,
      name: g.name,
      pts: String(g.pts),
      target: String(g.target || 1),
    });
    setConfirmingDelete(false);
    setDrawerMode({ id: g.id });
  };

  const closeDrawer = () => {
    setDrawerMode(null);
    setConfirmingDelete(false);
  };

  const handleSave = () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) return;
    const pts = parseInt(form.pts, 10) || 10;
    const target = isDaily ? Math.max(1, parseInt(form.target, 10) || 1) : undefined;
    if (drawerMode === 'new') {
      addGoal({ emoji: '', icon: form.icon || DEFAULT_GOAL_ICON, name: trimmedName, pts, target, isDaily });
    } else if (drawerMode) {
      updateGoal(drawerMode.id, { icon: form.icon || DEFAULT_GOAL_ICON, name: trimmedName, pts, target, isDaily });
    }
    closeDrawer();
  };

  const handleDelete = () => {
    if (drawerMode && drawerMode !== 'new') removeGoal(drawerMode.id);
    closeDrawer();
  };

  const renderGoalRow = (g: Goal) => {
    const subtitle = isDaily
      ? `${g.pts} pts · ${(g.target || 1) > 1 ? `×${g.target}/day` : 'Once per day'}`
      : `${g.pts > 0 ? '+' : ''}${g.pts} pts`;

    return (
      <div className="settings-row" key={g.id}>
        <span style={{ marginRight: 6 }}>
          <AppIcon iconKey={g.icon} emojiFallback={g.emoji} className="parent-item-emoji" />
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <div className="settings-label">{g.name}</div>
          <div className="settings-sub">{subtitle}</div>
        </span>
        <button
          type="button"
          className="settings-row-edit-btn"
          aria-label={`Edit ${g.name}`}
          onClick={() => openEdit(g)}
        >
          <FontAwesomeIcon icon={faPenToSquare} />
        </button>
      </div>
    );
  };

  const goals = state.goals.filter((g) => (g.isDaily !== false) === isDaily);
  const isNew = drawerMode === 'new';

  return (
    <div>
      <button type="button" className="btn btn-sm btn-purple" onClick={openAdd}>
        <FontAwesomeIcon icon={faPlus} /> {isDaily ? 'Add a Goal' : 'Add a Bonus Item'}
      </button>

      {goals.length === 0 ? (
        <div className="muted-note" style={{ fontSize: '0.8rem', padding: '12px 0' }}>
          {isDaily ? 'No daily goals added yet' : 'No bonus items added yet'}
        </div>
      ) : (
        <div className="mt-8">{goals.map(renderGoalRow)}</div>
      )}

      <Modal
        open={drawerMode != null}
        onClose={closeDrawer}
        closeLabel={isNew ? 'Close add goal' : 'Close edit goal'}
        overlayClassName="item-edit-drawer-overlay"
        title={isNew ? (isDaily ? 'Add a Goal' : 'Add a Bonus Item') : 'Edit Goal'}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <GoalFormFields
            icon={form.icon}
            legacyEmoji={form.emoji}
            onIconChange={(key) => setForm((f) => ({ ...f, icon: key }))}
            name={form.name}
            namePlaceholder="Goal name..."
            onNameChange={(name) => setForm((f) => ({ ...f, name }))}
            pts={form.pts}
            ptsPlaceholder={isDaily ? 'pts' : '± pts'}
            onPtsChange={(pts) => setForm((f) => ({ ...f, pts }))}
            isDaily={isDaily}
            target={form.target}
            onTargetChange={(target) => setForm((f) => ({ ...f, target }))}
          />
          <div className="muted-note goal-form-hint">
            {isDaily
              ? 'The × field sets how many times a goal must be done per day (e.g. "Drink water" ×3)'
              : 'Use a negative number to subtract points (e.g. "Was rude" −15)'}
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
                  <FontAwesomeIcon icon={faTrashCan} /> Delete Goal
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

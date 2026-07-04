import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faCheck, faXmark, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { AppIcon } from '../AppIcon';
import { IconPicker } from '../IconPicker';
import { ConfirmDialog } from '../ConfirmDialog';
import { PointsPanel } from './PointsPanel';
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

interface GoalTypeToggleProps {
  isDaily: boolean;
  onChange: (isDaily: boolean) => void;
}

// Single shared control for the Daily Goal / Bonus Points choice, used identically by the
// add-goal form and each goal's edit form so there's one toggle design in the whole panel.
function GoalTypeToggle({ isDaily, onChange }: GoalTypeToggleProps) {
  return (
    <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
      <div>
        <div className="settings-label">{isDaily ? 'Daily Goal' : 'Bonus Points'}</div>
        <div className="settings-sub">
          {isDaily
            ? 'Resets each day and appears in "Today\'s Goals"'
            : 'Repeats anytime, can add or subtract points'}
        </div>
      </div>
      <label className="goal-type-toggle" title="Daily Goal / Bonus Points">
        <input type="checkbox" checked={isDaily} onChange={(e) => onChange(e.target.checked)} />
        <span className="goal-type-toggle-track" />
      </label>
    </div>
  );
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
  isDaily: boolean;
  target: string;
  onTargetChange: (target: string) => void;
}

// Shared by the add-goal form and each goal row's inline edit form — both collect the
// same icon/name/points/target fields, just with different placeholders and surrounding
// submit controls. Points/target are normalized on blur so what will be saved is visible
// before submit, rather than a blank/invalid value silently becoming a default.
function GoalFormFields({
  icon, legacyEmoji, onIconChange, name, namePlaceholder, onNameChange,
  pts, ptsPlaceholder, onPtsChange, isDaily, target, onTargetChange,
}: GoalFormFieldsProps) {
  return (
    <>
      <IconPicker value={icon} legacyEmoji={legacyEmoji} onChange={onIconChange} ariaLabel="Choose a goal icon" />
      <input
        type="text"
        aria-label="Goal name"
        placeholder={namePlaceholder}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
      />
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
      {isDaily && (
        <input
          type="number"
          className="pts-input"
          aria-label="Times to complete per day"
          placeholder="×"
          title="Times to complete"
          min={1}
          max={99}
          value={target}
          onChange={(e) => onTargetChange(e.target.value)}
          onBlur={(e) => onTargetChange(clampTarget(e.target.value))}
        />
      )}
    </>
  );
}

export function GoalsPanel() {
  const { state, addGoal, removeGoal, updateGoal } = useGravy();
  const [icon, setIcon] = useState(DEFAULT_GOAL_ICON);
  const [name, setName] = useState('');
  const [pts, setPts] = useState('');
  const [target, setTarget] = useState('1');
  const [isDaily, setIsDaily] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editGoal, setEditGoal] = useState({ icon: '', emoji: '', name: '', pts: '', target: '1', isDaily: true });
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  const startEdit = (g: Goal) => {
    setConfirmRemoveId(null);
    setEditingId(g.id);
    setEditGoal({
      icon: g.icon || '',
      emoji: g.emoji,
      name: g.name,
      pts: String(g.pts),
      target: String(g.target || 1),
      isDaily: g.isDaily !== false,
    });
  };

  const saveEdit = (id: number) => {
    const trimmedName = editGoal.name.trim();
    if (!trimmedName) return;
    updateGoal(id, {
      icon: editGoal.icon || DEFAULT_GOAL_ICON,
      name: trimmedName,
      pts: parseInt(editGoal.pts) || 10,
      isDaily: editGoal.isDaily,
      target: editGoal.isDaily ? Math.max(1, parseInt(editGoal.target) || 1) : undefined,
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
      target: isDaily ? Math.max(1, parseInt(target) || 1) : undefined,
      isDaily,
    });
    setIcon(DEFAULT_GOAL_ICON);
    setName('');
    setPts('');
    setTarget('1');
  };

  const renderGoalRow = (g: Goal) => {
    const isDailyGoal = g.isDaily !== false;

    if (editingId === g.id) {
      return (
        <div key={g.id}>
          <GoalTypeToggle
            isDaily={editGoal.isDaily}
            onChange={(value) => setEditGoal({ ...editGoal, isDaily: value })}
          />
          <form className="input-row" onSubmit={(e) => { e.preventDefault(); saveEdit(g.id); }}>
            <GoalFormFields
              icon={editGoal.icon}
              legacyEmoji={editGoal.emoji}
              onIconChange={(key) => setEditGoal({ ...editGoal, icon: key })}
              name={editGoal.name}
              onNameChange={(value) => setEditGoal({ ...editGoal, name: value })}
              pts={editGoal.pts}
              onPtsChange={(value) => setEditGoal({ ...editGoal, pts: value })}
              isDaily={editGoal.isDaily}
              target={editGoal.target}
              onTargetChange={(value) => setEditGoal({ ...editGoal, target: value })}
            />
            <button type="submit" className="btn btn-sm btn-purple" title="Save" aria-label="Save">
              <FontAwesomeIcon icon={faCheck} />
            </button>
            <button type="button" className="btn btn-sm btn-pink" title="Cancel" aria-label="Cancel" onClick={() => setEditingId(null)}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </form>
        </div>
      );
    }

    return (
      <div key={g.id}>
        <div className="parent-item">
          <AppIcon iconKey={g.icon} emojiFallback={g.emoji} className="parent-item-emoji" />
          <div className="parent-item-info">
            <div className="parent-item-name">{g.name}</div>
            <div className="parent-item-pts">
              {g.pts < 0 ? '−' : '+'}{Math.abs(g.pts)} pts · {isDailyGoal ? 'Daily' : 'Bonus'}
              {isDailyGoal && (g.target || 1) > 1 ? ` · ×${g.target}` : ''}
            </div>
          </div>
          <button className="btn btn-sm btn-purple" title="Edit" aria-label={`Edit ${g.name}`} onClick={() => startEdit(g)}>
            <FontAwesomeIcon icon={faPen} />
          </button>
          <button
            className="btn btn-sm btn-pink"
            aria-label={`Remove ${g.name}`}
            onClick={() => setConfirmRemoveId(g.id)}
          >
            Remove
          </button>
        </div>
      </div>
    );
  };

  const goalPendingRemoval = state.goals.find((g) => g.id === confirmRemoveId);

  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  const bonusItems = state.goals.filter((g) => g.isDaily === false);

  return (
    <div>
      <div className="section-label">Add a Goal</div>
      <GoalTypeToggle isDaily={isDaily} onChange={setIsDaily} />
      <form className="input-row" onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
        <GoalFormFields
          icon={icon}
          onIconChange={setIcon}
          name={name}
          namePlaceholder="Goal name..."
          onNameChange={setName}
          pts={pts}
          ptsPlaceholder={isDaily ? 'pts' : '± pts'}
          onPtsChange={setPts}
          isDaily={isDaily}
          target={target}
          onTargetChange={setTarget}
        />
        <button type="submit" className="btn btn-sm btn-purple">
          Add
        </button>
      </form>
      <div className="muted-note" style={{ fontSize: '0.68rem', marginTop: -8, marginBottom: 'var(--space-md)' }}>
        {isDaily
          ? 'The × field sets how many times a goal must be done per day (e.g. "Drink water" ×3)'
          : 'Use a negative number to subtract points (e.g. "Was rude" −15)'}
      </div>

      <div className="section-label">Daily Goals</div>
      {dailyGoals.length === 0 ? (
        <div className="muted-note" style={{ fontSize: '0.8rem', padding: '12px 0' }}>
          No daily goals added yet
        </div>
      ) : (
        dailyGoals.map(renderGoalRow)
      )}

      <div className="section-label">Bonus Points</div>
      {bonusItems.length === 0 ? (
        <div className="muted-note" style={{ fontSize: '0.8rem', padding: '12px 0' }}>
          No bonus items added yet
        </div>
      ) : (
        bonusItems.map(renderGoalRow)
      )}

      <PointsPanel />

      <ConfirmDialog
        open={goalPendingRemoval != null}
        icon={faTrashCan}
        title="Remove this goal?"
        message={goalPendingRemoval ? `"${goalPendingRemoval.name}" will be removed. This can't be undone.` : ''}
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          if (confirmRemoveId != null) removeGoal(confirmRemoveId);
          setConfirmRemoveId(null);
        }}
        onCancel={() => setConfirmRemoveId(null)}
      />
    </div>
  );
}

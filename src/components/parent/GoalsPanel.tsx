import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
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

// Daily Goal / Bonus Points choice for the add-goal form.
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

interface GoalRowProps {
  goal: Goal;
  onUpdate: (id: number, patch: Partial<Omit<Goal, 'id'>>) => void;
  onRequestRemove: (goal: Goal) => void;
}

// Every field is live and saves on blur/change, the same as PointsPanel's food-points
// inputs — no separate Edit/Save/Cancel step. A brief checkmark flash confirms the save.
function GoalRow({ goal, onUpdate, onRequestRemove }: GoalRowProps) {
  const isDailyGoal = goal.isDaily !== false;
  const [name, setName] = useState(goal.name);
  const [pts, setPts] = useState(String(goal.pts));
  const [target, setTarget] = useState(String(goal.target || 1));
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimerRef = useRef<number | null>(null);

  const flashSaved = () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setSavedFlash(true);
    flashTimerRef.current = window.setTimeout(() => setSavedFlash(false), 1400);
  };

  return (
    <div className="parent-item">
      <IconPicker
        value={goal.icon}
        legacyEmoji={goal.emoji}
        onChange={(key) => { onUpdate(goal.id, { icon: key }); flashSaved(); }}
        ariaLabel={`Icon for ${goal.name}`}
      />
      <div className="parent-item-info">
        <input
          type="text"
          className="parent-item-name-input"
          aria-label="Goal name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const trimmed = name.trim();
            if (!trimmed) { setName(goal.name); return; }
            setName(trimmed);
            if (trimmed !== goal.name) { onUpdate(goal.id, { name: trimmed }); flashSaved(); }
          }}
        />
        <div className="goal-row-fields">
          <input
            type="number"
            aria-label={isDailyGoal ? 'Points' : 'Points (± for bonus/deduction)'}
            min={isDailyGoal ? 1 : -999}
            max={999}
            value={pts}
            onChange={(e) => setPts(e.target.value)}
            onBlur={(e) => {
              const clamped = clampPts(e.target.value, isDailyGoal);
              setPts(clamped);
              if (Number(clamped) !== goal.pts) { onUpdate(goal.id, { pts: Number(clamped) }); flashSaved(); }
            }}
          />
          {isDailyGoal && (
            <input
              type="number"
              aria-label="Times to complete per day"
              title="Times to complete"
              min={1}
              max={99}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onBlur={(e) => {
                const clamped = clampTarget(e.target.value);
                setTarget(clamped);
                if (Number(clamped) !== (goal.target || 1)) { onUpdate(goal.id, { target: Number(clamped) }); flashSaved(); }
              }}
            />
          )}
          <label className="goal-type-toggle" title="Daily Goal / Bonus Points">
            <input
              type="checkbox"
              checked={isDailyGoal}
              onChange={(e) => { onUpdate(goal.id, { isDaily: e.target.checked }); flashSaved(); }}
            />
            <span className="goal-type-toggle-track" />
          </label>
          <span className="goal-type-inline-label">{isDailyGoal ? 'Daily' : 'Bonus'}</span>
          {savedFlash && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
        </div>
      </div>
      <button
        className="btn btn-sm btn-pink"
        title="Remove"
        aria-label={`Remove ${goal.name}`}
        onClick={() => onRequestRemove(goal)}
      >
        <FontAwesomeIcon icon={faTrashCan} />
      </button>
    </div>
  );
}

export function GoalsPanel() {
  const { state, addGoal, removeGoal, updateGoal } = useGravy();
  const [icon, setIcon] = useState(DEFAULT_GOAL_ICON);
  const [name, setName] = useState('');
  const [pts, setPts] = useState('');
  const [target, setTarget] = useState('1');
  const [isDaily, setIsDaily] = useState(true);
  const [goalPendingRemoval, setGoalPendingRemoval] = useState<Goal | null>(null);

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

  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  const bonusItems = state.goals.filter((g) => g.isDaily === false);

  return (
    <div>
      <div className="section-label">Add a Goal</div>
      <GoalTypeToggle isDaily={isDaily} onChange={setIsDaily} />
      <form className="input-row" onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
        <IconPicker value={icon} onChange={setIcon} ariaLabel="Choose a goal icon" />
        <input
          type="text"
          aria-label="Goal name"
          placeholder="Goal name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          className="pts-input"
          aria-label={isDaily ? 'Points' : 'Points (± for bonus/deduction)'}
          placeholder={isDaily ? 'pts' : '± pts'}
          min={isDaily ? 1 : -999}
          max={999}
          value={pts}
          onChange={(e) => setPts(e.target.value)}
          onBlur={(e) => setPts(clampPts(e.target.value, isDaily))}
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
            onChange={(e) => setTarget(e.target.value)}
            onBlur={(e) => setTarget(clampTarget(e.target.value))}
          />
        )}
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
        dailyGoals.map((g) => (
          <GoalRow key={g.id} goal={g} onUpdate={updateGoal} onRequestRemove={setGoalPendingRemoval} />
        ))
      )}

      <div className="section-label">Bonus Points</div>
      {bonusItems.length === 0 ? (
        <div className="muted-note" style={{ fontSize: '0.8rem', padding: '12px 0' }}>
          No bonus items added yet
        </div>
      ) : (
        bonusItems.map((g) => (
          <GoalRow key={g.id} goal={g} onUpdate={updateGoal} onRequestRemove={setGoalPendingRemoval} />
        ))
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
          if (goalPendingRemoval) removeGoal(goalPendingRemoval.id);
          setGoalPendingRemoval(null);
        }}
        onCancel={() => setGoalPendingRemoval(null)}
      />
    </div>
  );
}

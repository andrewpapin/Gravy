import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUtensils,
  faListCheck,
  faStar,
  faGamepad,
  faEnvelope,
  faCircleCheck,
  faCircleXmark,
  faClockRotateLeft,
  faRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { isMostRecentNonUndone } from '../../state/actionLog';
import type { ActionLogType } from '../../state/types';

const TYPE_ICON: Record<ActionLogType, IconDefinition> = {
  food: faUtensils,
  goal: faListCheck,
  bonus: faStar,
  game: faGamepad,
  rewardRequested: faEnvelope,
  rewardApproved: faCircleCheck,
  rewardDeclined: faCircleXmark,
};

const UNDOABLE_TYPES: ActionLogType[] = ['food', 'goal', 'bonus'];

export function LogPanel() {
  const { state, undoActionLogEntry } = useGravy();

  if (state.actionLog.length === 0) {
    return (
      <div className="empty-state empty-state--bare" style={{ padding: '24px 0' }}>
        <span className="empty-state-emoji"><FontAwesomeIcon icon={faClockRotateLeft} /></span>
        <div className="empty-state-text">No actions logged yet</div>
      </div>
    );
  }

  const entries = [...state.actionLog].reverse();

  return (
    <div>
      <div className="section-label">Action Log</div>
      {entries.map((entry) => {
        const canUndo = UNDOABLE_TYPES.includes(entry.type) && isMostRecentNonUndone(state.actionLog, entry);
        const sign = entry.pts < 0 ? '−' : '+';
        return (
          <div className={`parent-item action-log-item${entry.undone ? ' action-log-item--undone' : ''}`} key={entry.id}>
            <span className="parent-item-emoji"><FontAwesomeIcon icon={TYPE_ICON[entry.type]} /></span>
            <div className="parent-item-info">
              <div className="parent-item-name">{entry.label}</div>
              <div className="action-log-meta">
                {new Date(entry.at).toLocaleString()}
                {entry.pts !== 0 && ` · ${sign}${Math.abs(entry.pts)} pts`}
              </div>
            </div>
            {canUndo && (
              <button className="btn btn-sm btn-ghost" onClick={() => undoActionLogEntry(entry)}>
                <FontAwesomeIcon icon={faRotateLeft} /> Undo
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  faCartShopping,
  faGear,
  faMedal,
  faUserPen,
  faRotate,
  faTriangleExclamation,
  faCloud,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { isMostRecentNonUndone } from '../../state/actionLog';
import type { ActionLogEntry, ActionLogType, AuditLogEntry, AuditLogType } from '../../state/types';

const ACTION_TYPE_ICON: Record<ActionLogType, IconDefinition> = {
  food: faUtensils,
  goal: faListCheck,
  bonus: faStar,
  game: faGamepad,
  rewardRequested: faEnvelope,
  rewardApproved: faCircleCheck,
  rewardDeclined: faCircleXmark,
};

const AUDIT_TYPE_ICON: Record<AuditLogType, IconDefinition> = {
  goalAdded: faListCheck,
  goalUpdated: faListCheck,
  goalRemoved: faListCheck,
  rewardAdded: faCartShopping,
  rewardUpdated: faCartShopping,
  rewardRemoved: faCartShopping,
  settingChanged: faGear,
  badgeConfigChanged: faMedal,
  profileAdded: faUserPen,
  profileUpdated: faUserPen,
  profileRemoved: faUserPen,
  resetToday: faRotate,
  resetAll: faTriangleExclamation,
  syncEnabled: faCloud,
  syncJoined: faCloud,
  syncDisabled: faCloud,
  syncCodeChanged: faCloud,
  syncDeleted: faTriangleExclamation,
  householdClaimed: faShieldHalved,
};

const UNDOABLE_TYPES: ActionLogType[] = ['food', 'goal', 'bonus'];

type MergedEntry =
  | { kind: 'action'; entry: ActionLogEntry }
  | { kind: 'audit'; entry: AuditLogEntry };

export function LogPanel() {
  const { state, undoActionLogEntry } = useGravy();

  const merged: MergedEntry[] = [
    ...state.actionLog.map((entry): MergedEntry => ({ kind: 'action', entry })),
    ...state.auditLog.map((entry): MergedEntry => ({ kind: 'audit', entry })),
  ].sort((a, b) => b.entry.at - a.entry.at);

  if (merged.length === 0) {
    return (
      <div className="empty-state empty-state--bare" style={{ padding: '24px 0' }}>
        <span className="empty-state-emoji"><FontAwesomeIcon icon={faClockRotateLeft} /></span>
        <div className="empty-state-text">No actions logged yet</div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-label">Log</div>
      {merged.map((item) => {
        if (item.kind === 'audit') {
          const entry = item.entry;
          return (
            <div className="parent-item action-log-item" key={entry.id}>
              <span className="parent-item-emoji"><FontAwesomeIcon icon={AUDIT_TYPE_ICON[entry.type]} /></span>
              <div className="parent-item-info">
                <div className="parent-item-name">{entry.label}</div>
                <div className="action-log-meta">
                  {new Date(entry.at).toLocaleString()}
                  {entry.actorLabel ? ` · by ${entry.actorLabel}` : ' · by an unsigned-in grown-up'}
                </div>
              </div>
            </div>
          );
        }
        const entry = item.entry;
        const canUndo = UNDOABLE_TYPES.includes(entry.type) && isMostRecentNonUndone(state.actionLog, entry);
        const sign = entry.pts < 0 ? '−' : '+';
        return (
          <div className={`parent-item action-log-item${entry.undone ? ' action-log-item--undone' : ''}`} key={entry.id}>
            <span className="parent-item-emoji"><FontAwesomeIcon icon={ACTION_TYPE_ICON[entry.type]} /></span>
            <div className="parent-item-info">
              <div className="parent-item-name">{entry.label}</div>
              <div className="action-log-meta">
                {new Date(entry.at).toLocaleString()}
                {entry.pts !== 0 && ` · ${sign}${Math.abs(entry.pts)} pts`}
                {entry.actorLabel && ` · by ${entry.actorLabel}`}
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

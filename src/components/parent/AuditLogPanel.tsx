import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faListCheck,
  faCartShopping,
  faGear,
  faMedal,
  faUserPen,
  faRotate,
  faTriangleExclamation,
  faCloud,
  faShieldHalved,
  faClockRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import type { AuditLogType } from '../../state/types';

const TYPE_ICON: Record<AuditLogType, IconDefinition> = {
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

// Epic 8 item 6 — grown-ups-only history of household admin/destructive actions (catalog edits,
// settings, profile CRUD, danger-zone resets, sync changes), each attributed to the parent
// account that performed it when one was signed in. Informational only — never undoable here,
// unlike the kid-progress Action Log.
export function AuditLogPanel() {
  const { state } = useGravy();

  if (state.auditLog.length === 0) {
    return (
      <div className="empty-state empty-state--bare" style={{ padding: '24px 0' }}>
        <span className="empty-state-emoji"><FontAwesomeIcon icon={faClockRotateLeft} /></span>
        <div className="empty-state-text">No admin actions logged yet</div>
      </div>
    );
  }

  const entries = [...state.auditLog].reverse();

  return (
    <div>
      <div className="section-label">Admin Log</div>
      {entries.map((entry) => (
        <div className="parent-item action-log-item" key={entry.id}>
          <span className="parent-item-emoji"><FontAwesomeIcon icon={TYPE_ICON[entry.type]} /></span>
          <div className="parent-item-info">
            <div className="parent-item-name">{entry.label}</div>
            <div className="action-log-meta">
              {new Date(entry.at).toLocaleString()}
              {entry.actorLabel ? ` · by ${entry.actorLabel}` : ' · by an unsigned-in grown-up'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloud, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useGravy, SYNC_SKIPPED_KEY } from '../state/GravyContext';
import { isValidHouseholdCode } from '../state/sync';

export function SyncGateModal() {
  const { householdCode, syncStatus, createHousehold, joinHousehold } = useGravy();
  const [joinCode, setJoinCode] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(SYNC_SKIPPED_KEY) === 'true');

  if (householdCode || dismissed) return null;

  const syncing = syncStatus === 'syncing';

  const handleSkip = () => {
    localStorage.setItem(SYNC_SKIPPED_KEY, 'true');
    setDismissed(true);
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    joinHousehold(joinCode).then((ok) => {
      if (ok) setJoinCode('');
    });
  };

  const handleCreateCustom = () => {
    if (!isValidHouseholdCode(customCode)) return;
    createHousehold(customCode).then((code) => {
      if (code) setCustomCode('');
    });
  };

  return (
    <div className="sync-gate-overlay">
      <div className="onb-modal-card">
        <span className="onb-icon-badge"><FontAwesomeIcon icon={faCloud} /></span>
        <div className="onb-title">Set Up Cloud Sync</div>
        <div className="onb-desc">
          Keep this device in sync with the rest of the family. Create a new
          household code, or enter an existing one to join.
        </div>
        <button className="btn btn-primary" onClick={() => createHousehold()} disabled={syncing}>
          <FontAwesomeIcon icon={faCloud} /> Create New Household
        </button>
        <div className="flex-row-full sync-gate-join">
          <input
            type="text"
            className="onb-input"
            placeholder="Or pick your own code"
            maxLength={6}
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
          />
          <button className="btn btn-primary" onClick={handleCreateCustom} disabled={syncing || !isValidHouseholdCode(customCode)}>
            Create
          </button>
        </div>
        <div className="settings-sub">6 characters — no 0, O, 1, or I</div>
        <div className="flex-row-full sync-gate-join">
          <input
            type="text"
            className="onb-input"
            placeholder="Enter household code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          />
          <button className="btn btn-primary" onClick={handleJoin} disabled={syncing || !joinCode.trim()}>
            Join
          </button>
        </div>
        {syncing && <div className="settings-sub sync-gate-status">Connecting…</div>}
        {!syncing && syncStatus === 'error' && (
          <div className="settings-sub sync-gate-status sync-gate-error">
            <FontAwesomeIcon icon={faTriangleExclamation} /> Couldn't connect — check the code and try again
          </div>
        )}
        <button className="btn btn-sm btn-ghost sync-gate-skip" onClick={handleSkip}>
          Maybe later — use this device only
        </button>
      </div>
    </div>
  );
}

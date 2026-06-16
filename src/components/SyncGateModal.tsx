import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloud, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useGrubClub, SYNC_SKIPPED_KEY } from '../state/GrubClubContext';

export function SyncGateModal() {
  const { householdCode, syncStatus, createHousehold, joinHousehold } = useGrubClub();
  const [joinCode, setJoinCode] = useState('');
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

  return (
    <div className="sync-gate-overlay">
      <div className="badge-popup sync-gate-card">
        <span className="badge-popup-icon"><FontAwesomeIcon icon={faCloud} /></span>
        <div className="badge-popup-name">Set Up Cloud Sync</div>
        <div className="badge-popup-desc">
          Keep this device in sync with the rest of the family. Create a new
          household code, or enter an existing one to join.
        </div>
        <button className="btn btn-primary" onClick={() => createHousehold()} disabled={syncing}>
          <FontAwesomeIcon icon={faCloud} /> Create New Household
        </button>
        <div className="flex-row-full sync-gate-join">
          <input
            type="text"
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

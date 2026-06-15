import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloud, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useGrubClub } from '../state/GrubClubContext';

export function SyncGateModal() {
  const { householdCode, syncStatus, createHousehold, joinHousehold } = useGrubClub();
  const [joinCode, setJoinCode] = useState('');

  if (householdCode) return null;

  const syncing = syncStatus === 'syncing';

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
        <div className="badge-popup-name">Cloud Sync Required</div>
        <div className="badge-popup-desc">
          GrubClub needs a household code to keep this device in sync with the
          rest of the family. Create a new household, or enter an existing
          code to join one.
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
      </div>
    </div>
  );
}

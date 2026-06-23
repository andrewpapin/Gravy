import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faCheck, faCloud, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { isValidHouseholdCode } from '../../state/sync';
import { ConfirmDialog } from '../ConfirmDialog';

export function SyncPanel() {
  const {
    householdCode,
    syncStatus,
    createHousehold,
    joinHousehold,
    leaveHousehold,
    deleteHouseholdEverywhere,
    changeHouseholdCode,
  } = useGravy();
  const [joinCode, setJoinCode] = useState('');
  const [customCreateCode, setCustomCreateCode] = useState('');
  const [editCode, setEditCode] = useState('');
  const [justChanged, setJustChanged] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    joinHousehold(joinCode).then((ok) => {
      if (ok) setJoinCode('');
    });
  };

  const handleCreateCustom = () => {
    if (!isValidHouseholdCode(customCreateCode)) return;
    createHousehold(customCreateCode).then((code) => {
      if (code) setCustomCreateCode('');
    });
  };

  const handleChangeCode = () => {
    if (!isValidHouseholdCode(editCode)) return;
    changeHouseholdCode(editCode).then((ok) => {
      if (ok) {
        setJustChanged(editCode);
        setEditCode('');
      }
    });
  };

  return (
    <div>
      <div className="section-label">Cloud Sync</div>
      {householdCode ? (
        <div className="settings-row settings-row--col">
          <div>
            <div className="settings-label">Household code</div>
            <div className="household-code-display">{householdCode}</div>
            <div className="settings-sub">
              {syncStatus === 'syncing' && 'Syncing…'}
              {syncStatus === 'idle' && <><FontAwesomeIcon icon={faCheck} /> Synced — enter this code on other phones to sync them</>}
              {syncStatus === 'error' && (
                <>
                  <FontAwesomeIcon icon={faTriangleExclamation} />{' '}
                  {navigator.onLine ? 'Sync error — will retry' : 'Offline — will sync when back online'}
                </>
              )}
            </div>
          </div>
          <button className="btn btn-primary btn-ghost" onClick={() => setConfirmLeave(true)}>
            Turn off cloud sync
          </button>
          <button className="btn btn-primary btn-dark" onClick={() => setConfirmDelete(true)}>
            <FontAwesomeIcon icon={faTrashCan} /> Delete household everywhere
          </button>
        </div>
      ) : null}
      {householdCode && (
        <div className="settings-row settings-row--col">
          <div>
            <div className="settings-label">Customize code</div>
            <div className="settings-sub">Use a memorable code instead — 6 characters, no 0, O, 1, or I</div>
          </div>
          <div className="flex-row-full">
            <input
              type="text"
              placeholder={householdCode}
              maxLength={6}
              value={editCode}
              onChange={(e) => setEditCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') handleChangeCode(); }}
            />
            <button
              className="btn btn-primary"
              onClick={handleChangeCode}
              disabled={syncStatus === 'syncing' || !isValidHouseholdCode(editCode) || editCode === householdCode}
            >
              Save
            </button>
          </div>
          {justChanged && (
            <div className="settings-sub">
              <FontAwesomeIcon icon={faCloud} /> Re-enter <strong>{justChanged}</strong> on your other devices to keep them synced.
            </div>
          )}
        </div>
      )}
      {!householdCode && (
        <div className="settings-row settings-row--col">
          <div>
            <div className="settings-label">Sync across phones</div>
            <div className="settings-sub">Create a household code, then enter it on other devices</div>
          </div>
          <button className="btn btn-primary" onClick={() => createHousehold()} disabled={syncStatus === 'syncing'}>
            <FontAwesomeIcon icon={faCloud} /> Enable cloud sync
          </button>
          <div className="settings-sub">Or pick your own code — 6 characters, no 0, O, 1, or I</div>
          <div className="flex-row-full">
            <input
              type="text"
              placeholder="e.g. SMITHS"
              maxLength={6}
              value={customCreateCode}
              onChange={(e) => setCustomCreateCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCustom(); }}
            />
            <button className="btn btn-primary" onClick={handleCreateCustom} disabled={syncStatus === 'syncing' || !isValidHouseholdCode(customCreateCode)}>
              Create
            </button>
          </div>
          <div className="settings-sub">Already have a code from another device?</div>
          <div className="flex-row-full">
            <input
              type="text"
              placeholder="Enter household code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
            />
            <button className="btn btn-primary" onClick={handleJoin} disabled={syncStatus === 'syncing'}>
              Join
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmLeave}
        icon={faCloud}
        title="Turn off cloud sync?"
        message="This device will stop syncing with the rest of the household. Your data stays on this device."
        confirmLabel="Turn off"
        danger
        onConfirm={() => {
          leaveHousehold();
          setConfirmLeave(false);
        }}
        onCancel={() => setConfirmLeave(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        icon={faTrashCan}
        title="Delete household everywhere?"
        message="This permanently deletes the shared household data from the cloud. Every device using this code — not just this one — will lose sync access. This can't be undone."
        confirmLabel="Delete everywhere"
        danger
        onConfirm={() => {
          deleteHouseholdEverywhere();
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

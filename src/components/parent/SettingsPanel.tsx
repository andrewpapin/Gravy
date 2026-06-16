import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faCheck, faCloud, faRotate } from '@fortawesome/free-solid-svg-icons';
import { useGrubClub } from '../../state/GrubClubContext';
import { ConfirmDialog } from '../ConfirmDialog';

type ConfirmStep = 'none' | 'resetToday' | 'resetAll1' | 'resetAll2' | 'leaveSync';

export function SettingsPanel() {
  const {
    state,
    saveSetting,
    resetToday,
    resetAll,
    householdCode,
    syncStatus,
    createHousehold,
    joinHousehold,
    leaveHousehold,
  } = useGrubClub();
  const [foodPts, setFoodPts] = useState(String(state.settings.foodPts));
  const [bonusPts, setBonusPts] = useState(String(state.settings.bonusPts));
  const [pin, setPin] = useState(String(state.settings.pin));
  const [childName, setChildName] = useState(state.settings.childName);
  const [joinCode, setJoinCode] = useState('');
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>('none');
  const [savedField, setSavedField] = useState<string | null>(null);
  const savedTimerRef = useRef<number | null>(null);

  const flashSaved = (field: string) => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSavedField(field);
    savedTimerRef.current = window.setTimeout(() => setSavedField(null), 1400);
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    joinHousehold(joinCode).then((ok) => {
      if (ok) setJoinCode('');
    });
  };

  return (
    <div>
      <div className="section-label">Cloud Sync</div>
      {householdCode ? (
        <div className="settings-row settings-row--col">
          <div>
            <div className="settings-label">
              Household code: <strong>{householdCode}</strong>
            </div>
            <div className="settings-sub">
              {syncStatus === 'syncing' && 'Syncing…'}
              {syncStatus === 'idle' && <><FontAwesomeIcon icon={faCheck} /> Synced — enter this code on other phones to sync them</>}
              {syncStatus === 'error' && <><FontAwesomeIcon icon={faTriangleExclamation} /> Sync error — will retry</>}
            </div>
          </div>
          <button className="btn btn-primary btn-ghost" onClick={() => setConfirmStep('leaveSync')}>
            Turn off cloud sync
          </button>
        </div>
      ) : (
        <div className="settings-row settings-row--col">
          <div>
            <div className="settings-label">Sync across phones</div>
            <div className="settings-sub">Create a household code, then enter it on other devices</div>
          </div>
          <button className="btn btn-primary" onClick={() => createHousehold()} disabled={syncStatus === 'syncing'}>
            <FontAwesomeIcon icon={faCloud} /> Enable cloud sync
          </button>
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
      <div className="section-label">Profile</div>
      <div className="settings-row">
        <div>
          <div className="settings-label">
            Child's name
            {savedField === 'childName' && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
          </div>
          <div className="settings-sub">Shown throughout the app</div>
        </div>
        <input
          type="text"
          maxLength={20}
          placeholder="Zack"
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          onBlur={(e) => {
            saveSetting('childName', e.target.value);
            flashSaved('childName');
          }}
        />
      </div>
      <div className="section-label">Points</div>
      <div className="settings-row">
        <div>
          <div className="settings-label">
            Points per food group
            {savedField === 'foodPts' && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
          </div>
          <div className="settings-sub">Awarded when {state.settings.childName} taps each food group</div>
        </div>
        <input
          type="number"
          min={1}
          max={100}
          value={foodPts}
          onChange={(e) => setFoodPts(e.target.value)}
          onBlur={(e) => {
            const clamped = Math.max(1, parseInt(e.target.value) || 1);
            setFoodPts(String(clamped));
            saveSetting('foodPts', e.target.value);
            flashSaved('foodPts');
          }}
        />
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">
            Full tray bonus
            {savedField === 'bonusPts' && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
          </div>
          <div className="settings-sub">Bonus for eating all 5 food groups</div>
        </div>
        <input
          type="number"
          min={0}
          max={500}
          value={bonusPts}
          onChange={(e) => setBonusPts(e.target.value)}
          onBlur={(e) => {
            const clamped = Math.max(0, parseInt(e.target.value) || 0);
            setBonusPts(String(clamped));
            saveSetting('bonusPts', e.target.value);
            flashSaved('bonusPts');
          }}
        />
      </div>
      <div className="section-label">PIN</div>
      <div className="settings-row">
        <div>
          <div className="settings-label">
            Change PIN
            {savedField === 'pin' && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
          </div>
          <div className="settings-sub">Enter a new 4-digit PIN</div>
        </div>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="1234"
          value={pin}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
            setPin(digits);
          }}
          onBlur={() => {
            if (pin.length === 4) {
              saveSetting('pin', pin);
              flashSaved('pin');
            } else {
              setPin(String(state.settings.pin));
            }
          }}
        />
      </div>
      <div className="section-label">Reset</div>
      <button className="btn btn-primary btn-pink mt-8" onClick={() => setConfirmStep('resetToday')}>
        <FontAwesomeIcon icon={faRotate} /> Reset Today's Progress
      </button>
      <button className="btn btn-primary btn-dark mt-8" style={{ marginTop: 8 }} onClick={() => setConfirmStep('resetAll1')}>
        <FontAwesomeIcon icon={faTriangleExclamation} /> Reset Everything
      </button>

      <ConfirmDialog
        open={confirmStep === 'resetToday'}
        icon={faRotate}
        title="Reset today's progress?"
        message="This will clear today's food and goal checkmarks. Points already earned today will be removed."
        confirmLabel="Reset"
        danger
        onConfirm={() => {
          resetToday();
          setConfirmStep('none');
        }}
        onCancel={() => setConfirmStep('none')}
      />
      <ConfirmDialog
        open={confirmStep === 'resetAll1'}
        icon={faTriangleExclamation}
        title="Reset everything?"
        message="This will delete ALL progress — points, badges, history, goals, and rewards. This can't be undone."
        confirmLabel="Continue"
        danger
        onConfirm={() => setConfirmStep('resetAll2')}
        onCancel={() => setConfirmStep('none')}
      />
      <ConfirmDialog
        open={confirmStep === 'resetAll2'}
        icon={faTriangleExclamation}
        title="Are you really sure?"
        message="All points, badges, and history will be gone for good."
        confirmLabel="Yes, reset everything"
        danger
        onConfirm={() => {
          resetAll();
          setConfirmStep('none');
        }}
        onCancel={() => setConfirmStep('none')}
      />
      <ConfirmDialog
        open={confirmStep === 'leaveSync'}
        icon={faCloud}
        title="Turn off cloud sync?"
        message="This device will stop syncing with the rest of the household. Your data stays on this device."
        confirmLabel="Turn off"
        danger
        onConfirm={() => {
          leaveHousehold();
          setConfirmStep('none');
        }}
        onCancel={() => setConfirmStep('none')}
      />
    </div>
  );
}

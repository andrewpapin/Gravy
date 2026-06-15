import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faCheck, faCloud, faRotate } from '@fortawesome/free-solid-svg-icons';
import { useGrubClub } from '../../state/GrubClubContext';

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
  const [weeklyCap, setWeeklyCap] = useState(String(state.settings.weeklyCap));
  const [pin, setPin] = useState(String(state.settings.pin));
  const [joinCode, setJoinCode] = useState('');

  const handleResetAll = () => {
    if (!window.confirm('⚠️ This will delete ALL progress. Are you sure?')) return;
    if (!window.confirm('Really? All points, badges, and history will be gone!')) return;
    resetAll();
  };

  const handleResetToday = () => {
    if (!window.confirm("Reset today's food and chore progress?")) return;
    resetToday();
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    joinHousehold(joinCode).then((ok) => {
      if (ok) setJoinCode('');
    });
  };

  const handleLeave = () => {
    if (!window.confirm('Turn off cloud sync on this device?')) return;
    leaveHousehold();
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
          <button className="btn btn-primary btn-ghost" onClick={handleLeave}>
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
            />
            <button className="btn btn-primary" onClick={handleJoin} disabled={syncStatus === 'syncing'}>
              Join
            </button>
          </div>
        </div>
      )}
      <div className="section-label">Points & Caps</div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Points per food group</div>
          <div className="settings-sub">Awarded when Zack taps each food group</div>
        </div>
        <input
          type="number"
          min={1}
          max={100}
          value={foodPts}
          onChange={(e) => setFoodPts(e.target.value)}
          onBlur={(e) => saveSetting('foodPts', e.target.value)}
        />
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Full tray bonus</div>
          <div className="settings-sub">Bonus for eating all 5 food groups</div>
        </div>
        <input
          type="number"
          min={0}
          max={500}
          value={bonusPts}
          onChange={(e) => setBonusPts(e.target.value)}
          onBlur={(e) => saveSetting('bonusPts', e.target.value)}
        />
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Weekly point cap</div>
          <div className="settings-sub">Max points Zack can earn per week (0 = unlimited)</div>
        </div>
        <input
          type="number"
          min={0}
          max={9999}
          value={weeklyCap}
          onChange={(e) => setWeeklyCap(e.target.value)}
          onBlur={(e) => saveSetting('weeklyCap', e.target.value)}
        />
      </div>
      <div className="section-label">PIN</div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Change PIN</div>
          <div className="settings-sub">Enter a new 4-digit PIN</div>
        </div>
        <input
          type="number"
          min={0}
          maxLength={4}
          placeholder="1234"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onBlur={(e) => saveSetting('pin', e.target.value)}
        />
      </div>
      <div className="section-label">Reset</div>
      <button className="btn btn-primary btn-pink mt-8" onClick={handleResetToday}>
        <FontAwesomeIcon icon={faRotate} /> Reset Today's Progress
      </button>
      <button className="btn btn-primary btn-dark mt-8" style={{ marginTop: 8 }} onClick={handleResetAll}>
        <FontAwesomeIcon icon={faTriangleExclamation} /> Reset Everything
      </button>
    </div>
  );
}

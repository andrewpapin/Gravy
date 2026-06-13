import { useState } from 'react';
import { useGrubClub } from '../../state/GrubClubContext';

export function SettingsPanel() {
  const { state, saveSetting, resetToday, resetAll } = useGrubClub();
  const [foodPts, setFoodPts] = useState(String(state.settings.foodPts));
  const [bonusPts, setBonusPts] = useState(String(state.settings.bonusPts));
  const [weeklyCap, setWeeklyCap] = useState(String(state.settings.weeklyCap));
  const [pin, setPin] = useState(String(state.settings.pin));

  const handleResetAll = () => {
    if (!window.confirm('⚠️ This will delete ALL progress. Are you sure?')) return;
    if (!window.confirm('Really? All points, badges, and history will be gone!')) return;
    resetAll();
  };

  const handleResetToday = () => {
    if (!window.confirm("Reset today's food and chore progress?")) return;
    resetToday();
  };

  return (
    <div>
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
      <button className="btn btn-primary mt-8" style={{ background: '#CC2936' }} onClick={handleResetToday}>
        🔄 Reset Today's Progress
      </button>
      <button className="btn btn-primary mt-8" style={{ background: '#888', marginTop: 8 }} onClick={handleResetAll}>
        ⚠️ Reset Everything
      </button>
    </div>
  );
}

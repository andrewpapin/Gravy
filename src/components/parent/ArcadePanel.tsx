import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';

export function ArcadePanel() {
  const { state, saveSetting } = useGravy();
  const [gamePts, setGamePts] = useState(String(state.settings.gamePts));
  const [savedField, setSavedField] = useState<string | null>(null);
  const savedTimerRef = useRef<number | null>(null);

  const flashSaved = (field: string) => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSavedField(field);
    savedTimerRef.current = window.setTimeout(() => setSavedField(null), 1400);
  };

  return (
    <div>
      <div className="section-label">Arcade</div>
      <div className="settings-row">
        <div>
          <div className="settings-label">
            Points per game win
            {savedField === 'gamePts' && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
          </div>
          <div className="settings-sub">Awarded when {state.settings.childName} wins a game (up to 3 wins/day)</div>
        </div>
        <input
          className="settings-input-compact"
          type="number"
          min={0}
          max={500}
          value={gamePts}
          onChange={(e) => setGamePts(e.target.value)}
          onBlur={(e) => {
            const clamped = Math.max(0, parseInt(e.target.value) || 0);
            setGamePts(String(clamped));
            saveSetting('gamePts', e.target.value);
            flashSaved('gamePts');
          }}
        />
      </div>
    </div>
  );
}

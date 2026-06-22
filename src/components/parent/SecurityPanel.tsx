import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';

export function SecurityPanel() {
  const { state, saveSetting } = useGravy();
  // PIN/recovery answer are hashed at rest — there's no plaintext to pre-fill these with,
  // so they always start blank and only overwrite the saved value if the parent types a new one.
  const [pin, setPin] = useState('');
  const [recoveryQuestion, setRecoveryQuestion] = useState(state.settings.recoveryQuestion);
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [recoveryAnswerTouched, setRecoveryAnswerTouched] = useState(false);
  const [savedField, setSavedField] = useState<string | null>(null);
  const savedTimerRef = useRef<number | null>(null);

  const flashSaved = (field: string) => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSavedField(field);
    savedTimerRef.current = window.setTimeout(() => setSavedField(null), 1400);
  };

  return (
    <div>
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
          placeholder="••••"
          value={pin}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
            setPin(digits);
          }}
          onBlur={() => {
            if (pin.length === 4) {
              saveSetting('pin', pin);
              flashSaved('pin');
            }
            setPin('');
          }}
        />
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">
            Recovery question
            {savedField === 'recoveryQuestion' && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
          </div>
          <div className="settings-sub">Shown if "Forgot PIN?" is tapped on the PIN screen</div>
        </div>
        <input
          type="text"
          maxLength={60}
          placeholder="What's our dog's name?"
          value={recoveryQuestion}
          onChange={(e) => setRecoveryQuestion(e.target.value)}
          onBlur={(e) => {
            saveSetting('recoveryQuestion', e.target.value);
            flashSaved('recoveryQuestion');
          }}
        />
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">
            Recovery answer
            {savedField === 'recoveryAnswer' && <FontAwesomeIcon icon={faCheck} className="saved-flash" />}
          </div>
          <div className="settings-sub">
            Not case-sensitive. {state.settings.recoveryAnswerHash ? 'Leave blank and save to disable PIN recovery' : 'Currently disabled'}
          </div>
        </div>
        <input
          type="text"
          maxLength={60}
          placeholder={state.settings.recoveryAnswerHash ? '••••••' : 'Rex'}
          value={recoveryAnswer}
          onChange={(e) => {
            setRecoveryAnswer(e.target.value);
            setRecoveryAnswerTouched(true);
          }}
          onBlur={(e) => {
            if (recoveryAnswerTouched) {
              saveSetting('recoveryAnswer', e.target.value);
              flashSaved('recoveryAnswer');
              setRecoveryAnswerTouched(false);
            }
            setRecoveryAnswer('');
          }}
        />
      </div>
    </div>
  );
}

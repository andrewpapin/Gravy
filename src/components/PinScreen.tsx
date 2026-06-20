import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faDeleteLeft, faKey } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';

interface PinScreenProps {
  onSuccess: () => void;
}

type RecoverStep = 'none' | 'question' | 'newPin';

export function PinScreen({ onSuccess }: PinScreenProps) {
  const { state, saveSetting, showToast } = useGravy();
  const [pin, setPin] = useState('');
  const [showError, setShowError] = useState(false);
  const [shake, setShake] = useState(false);
  const [recoverStep, setRecoverStep] = useState<RecoverStep>('none');
  const [recoverAnswer, setRecoverAnswer] = useState('');
  const [recoverError, setRecoverError] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const canRecover = state.settings.recoveryQuestion.trim() !== '' && state.settings.recoveryAnswer.trim() !== '';

  const submitRecoverAnswer = () => {
    if (recoverAnswer.trim().toLowerCase() === state.settings.recoveryAnswer.trim().toLowerCase()) {
      setRecoverError(false);
      setRecoverStep('newPin');
    } else {
      setRecoverError(true);
    }
  };

  const submitNewPin = () => {
    if (newPin.length !== 4 || newPin !== newPinConfirm) return;
    saveSetting('pin', newPin);
    showToast(faKey, 'PIN updated!');
    setRecoverStep('none');
    setRecoverAnswer('');
    setNewPin('');
    setNewPinConfirm('');
    onSuccess();
  };

  const pinKey = (digit: string) => {
    if (pin.length >= 4) return;
    setShowError(false);
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => checkPin(next), 150);
    }
  };

  const checkPin = (value: string) => {
    if (value === String(state.settings.pin)) {
      setPin('');
      onSuccess();
    } else {
      setShowError(true);
      setPin('');
      setShake(true);
    }
  };

  const pinDelete = () => {
    setShowError(false);
    setPin((p) => p.slice(0, -1));
  };

  // Use a ref so the keyboard handler always sees the latest pin value
  const pinRef = useRef(pin);
  useEffect(() => { pinRef.current = pin; }, [pin]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        const current = pinRef.current;
        if (current.length >= 4) return;
        setShowError(false);
        const next = current + e.key;
        setPin(next);
        if (next.length === 4) {
          setTimeout(() => checkPin(next), 150);
        }
      } else if (e.key === 'Backspace') {
        setShowError(false);
        setPin((p) => p.slice(0, -1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // checkPin is stable for the life of the component; re-run only when PIN setting changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.settings.pin]);

  if (recoverStep === 'question') {
    return (
      <div className="pin-screen">
        <div style={{ fontSize: '3rem' }}><FontAwesomeIcon icon={faKey} /></div>
        <div className="pin-title">Forgot PIN?</div>
        <div className="pin-sub">{state.settings.recoveryQuestion}</div>
        <form
          className="input-row"
          style={{ width: '100%', maxWidth: 280 }}
          onSubmit={(e) => { e.preventDefault(); submitRecoverAnswer(); }}
        >
          <input
            type="text"
            autoFocus
            placeholder="Your answer"
            value={recoverAnswer}
            onChange={(e) => { setRecoverAnswer(e.target.value); setRecoverError(false); }}
          />
          <button type="submit" className="btn btn-sm btn-purple">
            Check
          </button>
        </form>
        <div className={`pin-error ${recoverError ? 'show' : ''}`}>That's not it — try again!</div>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => { setRecoverStep('none'); setRecoverAnswer(''); setRecoverError(false); }}
          style={{ marginTop: 8 }}
        >
          ← Back
        </button>
      </div>
    );
  }

  if (recoverStep === 'newPin') {
    return (
      <div className="pin-screen">
        <div style={{ fontSize: '3rem' }}><FontAwesomeIcon icon={faKey} /></div>
        <div className="pin-title">Set a New PIN</div>
        <div className="pin-sub">Choose a new 4-digit PIN</div>
        <form
          className="input-row"
          style={{ width: '100%', maxWidth: 280, flexDirection: 'column' }}
          onSubmit={(e) => { e.preventDefault(); submitNewPin(); }}
        >
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoFocus
            placeholder="New PIN"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="Confirm PIN"
            value={newPinConfirm}
            onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
          <button type="submit" className="btn btn-sm btn-purple" disabled={newPin.length !== 4 || newPin !== newPinConfirm}>
            Save New PIN
          </button>
        </form>
        {newPin.length === 4 && newPinConfirm.length === 4 && newPin !== newPinConfirm && (
          <div className="pin-error show">PINs don't match</div>
        )}
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => { setRecoverStep('none'); setNewPin(''); setNewPinConfirm(''); }}
          style={{ marginTop: 8 }}
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="pin-screen">
      <div style={{ fontSize: '3rem' }}><FontAwesomeIcon icon={faLock} /></div>
      <div className="pin-sub">Enter the 4-digit PIN</div>
      <div className={`pin-dots ${shake ? 'shake' : ''}`} onAnimationEnd={() => setShake(false)}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''} ${showError ? 'error' : ''}`} />
        ))}
      </div>
      <div className={`pin-error ${showError ? 'show' : ''}`}>Wrong PIN — try again!</div>
      <div className="pin-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} className="pin-key" onClick={() => pinKey(d)}>
            {d}
          </button>
        ))}
        <div className="pin-key empty" />
        <button className="pin-key" onClick={() => pinKey('0')}>
          0
        </button>
        <button className="pin-key delete" onClick={pinDelete}>
          <FontAwesomeIcon icon={faDeleteLeft} />
        </button>
      </div>
      {canRecover && (
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => setRecoverStep('question')}
          style={{ marginTop: 4 }}
        >
          Forgot PIN?
        </button>
      )}
    </div>
  );
}

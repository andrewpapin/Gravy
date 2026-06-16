import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faDeleteLeft } from '@fortawesome/free-solid-svg-icons';
import { useGrubClub } from '../state/GrubClubContext';

interface PinScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function PinScreen({ onSuccess, onBack }: PinScreenProps) {
  const { state } = useGrubClub();
  const [pin, setPin] = useState('');
  const [showError, setShowError] = useState(false);
  const [shake, setShake] = useState(false);

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

  return (
    <div className="pin-screen">
      <div style={{ fontSize: '3rem' }}><FontAwesomeIcon icon={faLock} /></div>
      <div className="pin-title">Grown-Up Mode</div>
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
      <button
        className="btn btn-sm btn-ghost"
        onClick={onBack}
        style={{ marginTop: 8 }}
      >
        ← Back to {state.settings.childName}
      </button>
    </div>
  );
}

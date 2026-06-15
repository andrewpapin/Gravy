import { useState } from 'react';
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

  const pinKey = (digit: string) => {
    if (pin.length >= 4) return;
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
      setTimeout(() => setShowError(false), 2000);
    }
  };

  const pinDelete = () => setPin((p) => p.slice(0, -1));

  return (
    <div className="pin-screen">
      <div style={{ fontSize: '3rem' }}><FontAwesomeIcon icon={faLock} /></div>
      <div className="pin-title">Grown-Up Mode</div>
      <div className="pin-sub">Enter the 4-digit PIN</div>
      <div className="pin-dots">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
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

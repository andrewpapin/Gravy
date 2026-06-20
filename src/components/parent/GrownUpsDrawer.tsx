import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { PinScreen } from '../PinScreen';
import { ParentDashboard } from './ParentDashboard';

type Stage = 'pin' | 'dashboard';

interface HeaderState {
  title: string;
  onBack?: () => void;
}

interface GrownUpsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function GrownUpsDrawer({ open, onClose }: GrownUpsDrawerProps) {
  const [stage, setStage] = useState<Stage>('pin');
  const [header, setHeader] = useState<HeaderState>({ title: 'Grown-Up Mode' });
  // Re-prompt the PIN on every fresh open, adjusted during render (not an effect)
  // per https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setStage('pin');
  }

  return (
    <div
      className={`calendar-modal-overlay ${open ? 'show' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="calendar-modal-sheet">
        <div className="calendar-modal-header">
          <div className="calendar-modal-header-titles">
            {stage === 'dashboard' && header.onBack && (
              <button className="calendar-modal-back" onClick={header.onBack} aria-label="Back" type="button">
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
            )}
            <span className="calendar-modal-title">{stage === 'pin' ? 'Grown-Up Mode' : header.title}</span>
          </div>
          <button className="calendar-modal-close" onClick={onClose} aria-label="Close grown-up mode" type="button">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="calendar-modal-body">
          {stage === 'pin' ? (
            <PinScreen onSuccess={() => setStage('dashboard')} />
          ) : (
            <ParentDashboard onHeaderChange={setHeader} />
          )}
        </div>
      </div>
    </div>
  );
}

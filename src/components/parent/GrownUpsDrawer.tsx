import { lazy, Suspense, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { PinScreen } from '../PinScreen';
import { Modal } from '../Modal';

// Loaded on demand (after the PIN unlocks) so the parent dashboard's weight stays out of
// the initial bundle the kid-facing app ships.
const ParentDashboard = lazy(() =>
  import('./ParentDashboard').then((m) => ({ default: m.ParentDashboard })),
);

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
  // Bumped on every fresh open so <PinScreen key={pinNonce}> remounts — this drawer stays
  // mounted at all times (visibility is CSS-only), so a stale instance would otherwise hold
  // its own lockout state from whenever it last mounted instead of the latest shared lockout.
  const [pinNonce, setPinNonce] = useState(0);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStage('pin');
      setPinNonce((n) => n + 1);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="Close grown-up mode"
      title={
        <div className="calendar-modal-header-titles">
          {stage === 'dashboard' && header.onBack && (
            <button className="calendar-modal-back" onClick={header.onBack} aria-label="Back" type="button">
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
          )}
          <span className="calendar-modal-title">{stage === 'pin' ? 'Grown-Up Mode' : header.title}</span>
        </div>
      }
    >
      {stage === 'pin' ? (
        <PinScreen key={pinNonce} onSuccess={() => setStage('dashboard')} />
      ) : (
        <Suspense fallback={<div className="pin-screen"><div className="pin-sub">Loading…</div></div>}>
          <ParentDashboard onHeaderChange={setHeader} />
        </Suspense>
      )}
    </Modal>
  );
}

import { lazy, Suspense, useState } from 'react';
import { Modal } from '../Modal';

// Loaded on demand so the parent dashboard's weight stays out of the initial bundle the
// kid-facing app ships.
const ParentDashboard = lazy(() =>
  import('./ParentDashboard').then((m) => ({ default: m.ParentDashboard })),
);

interface HeaderState {
  title: string;
  onBack?: () => void;
}

interface GrownUpsDrawerProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

export function GrownUpsDrawer({ open, onClose, onBack }: GrownUpsDrawerProps) {
  const [header, setHeader] = useState<HeaderState>({ title: 'Grown-Up Mode' });

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="Close grown-up mode"
      title={header.title}
      onBack={header.onBack ?? onBack}
    >
      <Suspense fallback={<div className="pin-screen"><div className="pin-sub">Loading…</div></div>}>
        <ParentDashboard onHeaderChange={setHeader} />
      </Suspense>
    </Modal>
  );
}

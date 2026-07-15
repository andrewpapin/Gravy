import { lazy, Suspense, useState } from 'react';
import { useGravy } from '../../state/GravyContext';
import { Modal } from '../Modal';
import { SignInPrompt } from '../SignInPrompt';

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

// Reached only via AccountMenu's own lock check, but this component (like the rest of the app)
// never unmounts once opened — so if the account signs out *while this is already open* (e.g.
// the "Sign out" button inside Advanced Settings > Parent Account), grownUpUnlocked flipping
// false must re-lock this drawer too, not just the AccountMenu the user isn't looking at anymore.
// Mirrors ApprovalsDrawer's self-gating pattern.
export function GrownUpsDrawer({ open, onClose, onBack }: GrownUpsDrawerProps) {
  const { grownUpUnlocked } = useGravy();
  const locked = !grownUpUnlocked;
  const [header, setHeader] = useState<HeaderState>({ title: 'Game Settings' });
  const [signInNonce, setSignInNonce] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSignInNonce((n) => n + 1);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="Close grown-up mode"
      title={locked ? 'Sign In' : header.title}
      onBack={locked ? onBack : (header.onBack ?? onBack)}
    >
      {locked ? (
        <SignInPrompt key={signInNonce} />
      ) : (
        <Suspense fallback={<div className="pin-screen"><div className="pin-sub">Loading…</div></div>}>
          <ParentDashboard onHeaderChange={setHeader} />
        </Suspense>
      )}
    </Modal>
  );
}

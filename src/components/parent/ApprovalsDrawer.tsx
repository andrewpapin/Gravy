import { useState } from 'react';
import { useGravy } from '../../state/GravyContext';
import { Modal } from '../Modal';
import { SignInPrompt } from '../SignInPrompt';
import { ApprovalsPanel } from './ApprovalsPanel';

interface ApprovalsDrawerProps {
  open: boolean;
  onClose: () => void;
}

// Reached directly from the TopBar bell (not nested under the already-unlocked AccountMenu), so
// — unlike the other parent drawers — this one gates itself: locked, it shows SignInPrompt
// instead of the pending list, falling away back to ApprovalsPanel on its own once
// grownUpUnlocked flips true (computed at render, same mechanic as AccountMenu).
export function ApprovalsDrawer({ open, onClose }: ApprovalsDrawerProps) {
  const { grownUpUnlocked } = useGravy();
  const locked = !grownUpUnlocked;
  const [prevOpen, setPrevOpen] = useState(open);
  const [signInNonce, setSignInNonce] = useState(0);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSignInNonce((n) => n + 1);
  }

  return (
    <Modal open={open} onClose={onClose} closeLabel="Close approvals" title={locked ? 'Sign In' : 'Approvals'}>
      {locked ? <SignInPrompt key={signInNonce} /> : <ApprovalsPanel />}
    </Modal>
  );
}

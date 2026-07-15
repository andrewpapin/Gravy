import { useState } from 'react';
import { useGravy } from '../../state/GravyContext';
import { Modal } from '../Modal';
import { SignInPrompt } from '../SignInPrompt';
import { CalendarPanel } from './CalendarPanel';

interface HeaderState {
  title: string;
  onBack?: () => void;
}

interface CalendarDrawerProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

// Re-locks itself the instant grownUpUnlocked flips false, even if that happens while this
// drawer is already open (e.g. signing out via Advanced Settings > Parent Account in a
// different drawer). Mirrors ApprovalsDrawer's self-gating pattern.
export function CalendarDrawer({ open, onClose, onBack }: CalendarDrawerProps) {
  const { grownUpUnlocked } = useGravy();
  const locked = !grownUpUnlocked;
  const [header, setHeader] = useState<HeaderState>({ title: 'Calendar' });
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
      closeLabel="Close calendar"
      title={locked ? 'Sign In' : header.title}
      onBack={locked ? onBack : (header.onBack ?? onBack)}
    >
      {locked ? <SignInPrompt key={signInNonce} /> : <CalendarPanel onHeaderChange={setHeader} goToRoot={onBack} />}
    </Modal>
  );
}

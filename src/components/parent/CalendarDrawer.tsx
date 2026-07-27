import { useState } from 'react';
import { useGravy } from '../../state/GravyContext';
import { Modal } from '../Modal';
import { SignInPrompt } from '../SignInPrompt';
import { FullPageOverlay } from '../FullPageOverlay';
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

  // FullPageOverlay has no hidden state (unlike Modal's `open` prop) — must gate on `open` here,
  // not just `locked`, or this would render on top of everything even while closed.
  if (open && locked) {
    return (
      <FullPageOverlay onBack={onBack}>
        <SignInPrompt key={signInNonce} />
      </FullPageOverlay>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="Close calendar"
      title={header.title}
      onBack={header.onBack ?? onBack}
    >
      <CalendarPanel onHeaderChange={setHeader} goToRoot={onBack} />
    </Modal>
  );
}

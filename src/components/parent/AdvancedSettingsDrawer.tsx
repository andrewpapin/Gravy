import { useState } from 'react';
import { useGravy } from '../../state/GravyContext';
import { Modal } from '../Modal';
import { SignInPrompt } from '../SignInPrompt';
import { SettingsPanel } from './SettingsPanel';

interface HeaderState {
  title: string;
  onBack?: () => void;
}

interface AdvancedSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

// This holds the family code, audit log, and destructive reset controls, so — like
// GrownUpsDrawer — it must re-lock itself the instant grownUpUnlocked flips false, even if that
// happens via the "Sign out" button nested inside its own Parent Account panel while this drawer
// is still open. Mirrors ApprovalsDrawer's self-gating pattern.
export function AdvancedSettingsDrawer({ open, onClose, onBack }: AdvancedSettingsDrawerProps) {
  const { grownUpUnlocked } = useGravy();
  const locked = !grownUpUnlocked;
  const [header, setHeader] = useState<HeaderState>({ title: 'Advanced Settings' });
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
      closeLabel="Close advanced settings"
      title={locked ? 'Sign In' : header.title}
      onBack={locked ? onBack : (header.onBack ?? onBack)}
    >
      {locked ? <SignInPrompt key={signInNonce} /> : <SettingsPanel onHeaderChange={setHeader} />}
    </Modal>
  );
}

import { useState } from 'react';
import { Modal } from '../Modal';
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

export function AdvancedSettingsDrawer({ open, onClose, onBack }: AdvancedSettingsDrawerProps) {
  const [header, setHeader] = useState<HeaderState>({ title: 'Advanced Settings' });

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="Close advanced settings"
      title={header.title}
      onBack={header.onBack ?? onBack}
    >
      <SettingsPanel onHeaderChange={setHeader} />
    </Modal>
  );
}

import { Modal } from '../Modal';
import { SettingsPanel } from './SettingsPanel';

interface AdvancedSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

export function AdvancedSettingsDrawer({ open, onClose, onBack }: AdvancedSettingsDrawerProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="Close advanced settings"
      title="Advanced Settings"
      onBack={onBack}
    >
      <SettingsPanel />
    </Modal>
  );
}

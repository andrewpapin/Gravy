import { Modal } from '../Modal';
import { SettingsPanel } from './SettingsPanel';

interface AdvancedSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AdvancedSettingsDrawer({ open, onClose }: AdvancedSettingsDrawerProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="Close advanced settings"
      title={<span className="calendar-modal-title">Advanced Settings</span>}
    >
      <SettingsPanel />
    </Modal>
  );
}

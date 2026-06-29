import { Modal } from '../Modal';
import { LogPanel } from './LogPanel';

interface LogDrawerProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

export function LogDrawer({ open, onClose, onBack }: LogDrawerProps) {
  return (
    <Modal open={open} onClose={onClose} closeLabel="Close log" title="Log" onBack={onBack}>
      <LogPanel />
    </Modal>
  );
}

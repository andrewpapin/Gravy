import { Modal } from '../Modal';
import { LogPanel } from './LogPanel';

interface LogDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function LogDrawer({ open, onClose }: LogDrawerProps) {
  return (
    <Modal open={open} onClose={onClose} closeLabel="Close log" title={<span className="calendar-modal-title">Log</span>}>
      <LogPanel />
    </Modal>
  );
}

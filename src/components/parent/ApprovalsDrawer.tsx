import { Modal } from '../Modal';
import { ApprovalsPanel } from './ApprovalsPanel';

interface ApprovalsDrawerProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

export function ApprovalsDrawer({ open, onClose, onBack }: ApprovalsDrawerProps) {
  return (
    <Modal open={open} onClose={onClose} closeLabel="Close approvals" title="Approvals" onBack={onBack}>
      <ApprovalsPanel />
    </Modal>
  );
}

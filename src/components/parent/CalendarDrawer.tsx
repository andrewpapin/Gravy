import { useState } from 'react';
import { Modal } from '../Modal';
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

export function CalendarDrawer({ open, onClose, onBack }: CalendarDrawerProps) {
  const [header, setHeader] = useState<HeaderState>({ title: 'Calendar' });

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

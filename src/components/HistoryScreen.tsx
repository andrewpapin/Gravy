import { Modal } from './Modal';
import { CalendarGrid } from './CalendarGrid';

interface HistoryScreenProps {
  open: boolean;
  onClose: () => void;
  onPickDate: (dateStr: string) => void;
}

export function HistoryScreen({ open, onClose, onPickDate }: HistoryScreenProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="Close history"
      title={<span className="calendar-modal-title">History</span>}
    >
      <CalendarGrid onPickDate={(dateStr) => { onPickDate(dateStr); onClose(); }} />
    </Modal>
  );
}

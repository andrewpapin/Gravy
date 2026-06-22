import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  closeLabel: string;
  title: ReactNode;
  children: ReactNode;
}

export function Modal({ open, onClose, closeLabel, title, children }: ModalProps) {
  return (
    <div
      className={`calendar-modal-overlay ${open ? 'show' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="calendar-modal-sheet">
        <div className="calendar-modal-header">
          {title}
          <button className="calendar-modal-close" onClick={onClose} aria-label={closeLabel} type="button">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="calendar-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

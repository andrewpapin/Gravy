import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { useFocusTrap } from './useFocusTrap';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  closeLabel: string;
  title: ReactNode;
  onBack?: () => void;
  children: ReactNode;
}

export function Modal({ open, onClose, closeLabel, title, onBack, children }: ModalProps) {
  const sheetRef = useFocusTrap<HTMLDivElement>(open, onClose);
  return (
    <div
      className={`calendar-modal-overlay ${open ? 'show' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="calendar-modal-sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={closeLabel.replace(/^Close /i, '')}
        tabIndex={-1}
      >
        <div className="calendar-modal-header">
          {onBack ? (
            <div className="calendar-modal-header-titles">
              <button className="calendar-modal-back" onClick={onBack} aria-label="Back" type="button">
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <span className="calendar-modal-title">{title}</span>
            </div>
          ) : (
            <span className="calendar-modal-title">{title}</span>
          )}
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

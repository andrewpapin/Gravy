import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { useFocusTrap } from './useFocusTrap';

interface ConfirmDialogProps {
  open: boolean;
  icon: IconDefinition;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  icon,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const popupRef = useFocusTrap<HTMLDivElement>(open, onCancel);
  return (
    <div
      className={`confirm-dialog-overlay ${open ? 'show' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {open && (
        <div className="confirm-dialog" ref={popupRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
          <span className="confirm-dialog-icon"><FontAwesomeIcon icon={icon} /></span>
          <div className="confirm-dialog-title">{title}</div>
          <div className="confirm-dialog-message">{message}</div>
          <div className="confirm-dialog-btns">
            <button className="btn btn-sm btn-ghost" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button className={`btn btn-sm ${danger ? 'btn-pink' : 'btn-green'}`} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

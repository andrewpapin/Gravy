import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';

export function StorageErrorBanner() {
  const { storageError, dismissStorageError } = useGravy();
  if (!storageError) return null;

  return (
    <div className="update-prompt storage-error-banner">
      <FontAwesomeIcon icon={faTriangleExclamation} />
      <span>Couldn't save — this device's storage is full or unavailable</span>
      <button
        type="button"
        className="update-prompt-dismiss"
        aria-label="Dismiss storage warning"
        onClick={dismissStorageError}
      >
        ✕
      </button>
    </div>
  );
}

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_CHECK_INTERVAL_MS = 60_000;

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
      });
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="update-prompt">
      <FontAwesomeIcon icon={faArrowsRotate} />
      <span>A new version is ready</span>
      <button
        type="button"
        className="btn btn-sm btn-green"
        onClick={() => updateServiceWorker(true)}
      >
        Update
      </button>
      <button
        type="button"
        className="update-prompt-dismiss"
        aria-label="Dismiss update notice"
        onClick={() => setNeedRefresh(false)}
      >
        ✕
      </button>
    </div>
  );
}

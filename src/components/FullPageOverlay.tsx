import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';

// Shared full-screen treatment for every auth-adjacent screen that should read as its own page
// rather than a modal/drawer overlaying HomeScreen — Onboarding, SignedOutGate, FirstKidPrompt,
// SyncGatePage, and AccountMenu's sign-in step all render this instead of duplicating the
// `.onb-screen`/`.onb-back`/`.onb-content` markup. Pass `onBack` to show a back button (e.g.
// returning to a previous phase/screen); omit it for a page with no way back (a mandatory gate,
// or the first step of a flow).
export function FullPageOverlay({ onBack, children }: { onBack?: () => void; children: ReactNode }) {
  return (
    <div className="onb-screen">
      {onBack && (
        <button className="onb-back" onClick={onBack} aria-label="Back">
          <FontAwesomeIcon icon={faChevronLeft} /> Back
        </button>
      )}
      <div className="onb-content">{children}</div>
    </div>
  );
}

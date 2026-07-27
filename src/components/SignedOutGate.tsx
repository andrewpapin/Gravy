import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightFromBracket, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { SignInPrompt } from './SignInPrompt';

// Shown full-screen, on top of everything (same treatment as Onboarding — see .onb-screen),
// the moment a signed-in parent account signs out on this device (see the authUser transition
// watched in AppShell). Blocks the kid HomeScreen behind it until the grown-up either signs back
// in or explicitly hands the device to a kid, so "Log out" actually locks the device instead of
// silently dropping back to a fully-usable HomeScreen.
export function SignedOutGate({ onContinueAsKid }: { onContinueAsKid: () => void }) {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <div className="onb-screen">
      {showSignIn && (
        <button className="onb-back" onClick={() => setShowSignIn(false)} aria-label="Back">
          <FontAwesomeIcon icon={faChevronLeft} /> Back
        </button>
      )}
      <div className="onb-content">
        {showSignIn ? (
          <SignInPrompt />
        ) : (
          <>
            <span className="onb-icon-badge"><FontAwesomeIcon icon={faRightFromBracket} /></span>
            <div className="onb-title">You're Signed Out</div>
            <div className="onb-desc">
              Sign back in as a grown-up, or hand the device to your kid to keep playing.
            </div>
            <div className="onb-actions">
              <button className="btn btn-primary" onClick={() => setShowSignIn(true)}>
                Sign In as Grown-Up
              </button>
              <button className="btn btn-ghost" onClick={onContinueAsKid}>
                Continue as Kid
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

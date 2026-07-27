import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChild } from '@fortawesome/free-solid-svg-icons';
import { SignInPrompt } from './SignInPrompt';
import { FullPageOverlay } from './FullPageOverlay';

// Shown full-screen, on top of everything (same treatment as Onboarding — see FullPageOverlay),
// the moment a signed-in parent account signs out on this device (see the authUser transition
// watched in AppShell). Blocks the kid HomeScreen behind it until the grown-up either signs back
// in or explicitly hands the device to a kid, so "Log out" actually locks the device instead of
// silently dropping back to a fully-usable HomeScreen. Leads with the sign-in form itself
// (re-authenticating is the expected path right after a sign-out) rather than an intermediate
// landing screen; "Continue as Kid" is the secondary, de-emphasized escape hatch underneath it.
export function SignedOutGate({ onContinueAsKid }: { onContinueAsKid: () => void }) {
  return (
    <FullPageOverlay>
      <SignInPrompt />
      <button className="btn btn-ghost signed-out-gate-kid-btn" onClick={onContinueAsKid}>
        <FontAwesomeIcon icon={faChild} /> Continue as Kid
      </button>
    </FullPageOverlay>
  );
}

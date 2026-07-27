import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';

// Auto-dismissing confirmation, shown once right when a parent's sign-out actually happens (not
// on every reload while SignedOutGate is still showing from a persisted flag — see `nonce`,
// bumped only on the live signed-in -> signed-out transition in AppShell). `prevNonce` reacts to
// a changed nonce during render (same "adjusting state during render" pattern AccountMenu uses
// for its own sign-in-prompt reset) rather than in an effect, so it never fires on mount; the
// effect below only owns the auto-hide timeout, which is the one part that's genuinely a
// subscription to time passing.
export function LogoutToast({ nonce }: { nonce: number }) {
  const [prevNonce, setPrevNonce] = useState(nonce);
  const [visible, setVisible] = useState(false);
  if (nonce !== prevNonce) {
    setPrevNonce(nonce);
    setVisible(true);
  }

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), 2500);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="update-prompt logout-toast" role="status">
      <FontAwesomeIcon icon={faCircleCheck} /> Signed out successfully
    </div>
  );
}

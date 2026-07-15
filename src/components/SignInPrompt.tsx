import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserShield, faEnvelope, faTriangleExclamation, faCloud, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';

// Shown inline inside AccountMenu when a locked item (or the header Sign In action) is tapped.
// Two cases, distinguished by auth/membership state — see isGrownUpUnlocked in state/auth.ts:
//   1. Not signed in at all — sign up / sign in / magic link (same fields as AccountPanel's old
//      not-signed-in view, kept separate here since this is a compact inline card rather than a
//      full settings panel).
//   2. Signed in, but not a member of this device's household — prompt for the family code so
//      gravy_lookup_household's existing auto-member-add can link this account (the mechanism a
//      co-parent or a parent setting up a second device both reuse).
// There's no explicit "success" callback: grownUpUnlocked recomputes automatically once
// authUser/householdStatus update, so AccountMenu just watches that and closes this prompt itself.
export function SignInPrompt() {
  const {
    authUser, signUp, signIn, sendSignInLink, sendPasswordReset,
    householdCode, householdStatus, joinHousehold, syncStatus,
  } = useGravy();
  const [mode, setMode] = useState<'signup' | 'signin' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [joinCode, setJoinCode] = useState(householdCode ?? '');

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = emailValid && password.length >= 6 && !busy;
  const syncing = syncStatus === 'syncing';

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok && res.error) setError(res.error);
    return res.ok;
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    run(() => (mode === 'signup' ? signUp(email, password) : signIn(email, password)));
  };

  const handleMagicLink = async () => {
    if (!emailValid || busy) return;
    const ok = await run(() => sendSignInLink(email));
    if (ok) setLinkSent(true);
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    joinHousehold(joinCode);
  };

  const handleForgotPassword = async () => {
    if (!emailValid || busy) return;
    const ok = await run(() => sendPasswordReset(email));
    if (ok) setResetSent(true);
  };

  // Case 2: signed in already, just not a member of this device's household yet.
  if (authUser && !householdStatus?.isMember) {
    return (
      <div className="pin-screen">
        <div style={{ fontSize: '3rem' }}><FontAwesomeIcon icon={faUsers} /></div>
        <div className="pin-title">Join This Family</div>
        <div className="pin-sub">
          Signed in as {authUser.email ?? 'your account'}, but this device isn't part of a family
          yet. Enter the family code to get access.
        </div>
        <div className="flex-row-full sync-gate-join" style={{ width: '100%', maxWidth: 280 }}>
          <input
            type="text"
            className="onb-input"
            placeholder="Family code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
            autoFocus
          />
          <button className="btn btn-primary" onClick={handleJoin} disabled={syncing || !joinCode.trim()}>
            <FontAwesomeIcon icon={faCloud} /> Join
          </button>
        </div>
        {!syncing && syncStatus === 'error' && (
          <div className="settings-sub sync-gate-status sync-gate-error">
            <FontAwesomeIcon icon={faTriangleExclamation} /> Couldn't connect — check the code and try again
          </div>
        )}
      </div>
    );
  }

  // Case 1b: forgot-password sub-flow, reachable from case 1's sign-in mode.
  if (mode === 'forgot') {
    return (
      <div className="pin-screen">
        <div style={{ fontSize: '3rem' }}><FontAwesomeIcon icon={faEnvelope} /></div>
        <div className="pin-title">Reset Your Password</div>
        <div className="pin-sub">
          Enter your parent email and we'll send you a link to set a new password.
        </div>
        <div className="flex-row-full" style={{ flexDirection: 'column', width: '100%', maxWidth: 280, gap: 8 }}>
          <input
            type="email"
            autoComplete="email"
            className="onb-input"
            placeholder="Parent email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); setResetSent(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleForgotPassword(); }}
            autoFocus
          />
        </div>
        {error && (
          <div className="settings-sub sync-gate-status sync-gate-error">
            <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
          </div>
        )}
        {resetSent && (
          <div className="settings-sub sync-gate-status">
            <FontAwesomeIcon icon={faEnvelope} /> Reset link sent — check your email.
          </div>
        )}
        <button
          className="btn btn-primary"
          onClick={handleForgotPassword}
          disabled={!emailValid || busy}
          style={{ marginTop: 8 }}
        >
          Send Reset Link
        </button>
        <button
          className="onb-link"
          onClick={() => { setMode('signin'); setError(null); setResetSent(false); }}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  // Case 1: not signed in at all.
  return (
    <div className="pin-screen">
      <div style={{ fontSize: '3rem' }}><FontAwesomeIcon icon={faUserShield} /></div>
      <div className="pin-title">Sign In to Continue</div>
      <div className="pin-sub">
        Sign in with your parent account to reach settings and approvals.
      </div>
      <div className="flex-row-full" style={{ flexDirection: 'column', width: '100%', maxWidth: 280, gap: 8 }}>
        <input
          type="email"
          autoComplete="email"
          className="onb-input"
          placeholder="Parent email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); setLinkSent(false); }}
        />
        <input
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          className="onb-input"
          placeholder="Password (at least 6 characters)"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        />
      </div>
      {mode === 'signin' && (
        <button
          className="onb-link"
          style={{ marginTop: -4 }}
          onClick={() => { setMode('forgot'); setError(null); }}
        >
          Forgot password?
        </button>
      )}
      {error && (
        <div className="settings-sub sync-gate-status sync-gate-error">
          <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
        </div>
      )}
      {linkSent && (
        <div className="settings-sub sync-gate-status">
          <FontAwesomeIcon icon={faEnvelope} /> Sign-in link sent — check your email.
        </div>
      )}
      <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit} style={{ marginTop: 8 }}>
        {mode === 'signup' ? 'Create account' : 'Sign in'}
      </button>
      <button className="btn btn-sm btn-ghost" onClick={handleMagicLink} disabled={!emailValid || busy}>
        <FontAwesomeIcon icon={faEnvelope} /> Email me a sign-in link instead
      </button>
      <button
        className="onb-link"
        onClick={() => { setMode((m) => (m === 'signup' ? 'signin' : 'signup')); setError(null); }}
      >
        {mode === 'signup' ? 'Already have an account? Sign in' : 'No account yet? Create one'}
      </button>
    </div>
  );
}

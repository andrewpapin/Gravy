import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserShield, faEnvelope, faCircleCheck, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';

interface AccountSetupStepProps {
  initialMode?: 'signup' | 'signin';
  // Called once the parent finishes signing in — reports which mode they used so Onboarding can
  // branch (signup: auto-create+own a new household; signin: prompt for a family code to join).
  onDone: (mode: 'signup' | 'signin') => void;
}

// Mandatory parent-account step shown during onboarding, BEFORE the household is created — so a
// signed-in parent's new household is owned from the start (createHousehold sets owner_id
// automatically), with no separate "claim" needed later. COPPA: collects only a parent email,
// never any child data.
export function AccountSetupStep({ initialMode = 'signup', onDone }: AccountSetupStepProps) {
  const { authUser, signUp, signIn, sendSignInLink, resendConfirmation, sendPasswordReset } = useGravy();
  const [mode, setMode] = useState<'signup' | 'signin' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [resent, setResent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = emailValid && password.length >= 6 && !busy;

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok && res.error) setError(res.error);
    return res.ok;
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (mode === 'signin') {
      run(() => signIn(email, password));
      return;
    }
    setBusy(true);
    setError(null);
    const res = await signUp(email, password);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    // If not, `authUser` below will flip truthy on its own once onAuthChange reports a session —
    // no polling needed, Supabase mirrors the session to every tab via localStorage.
    if (res.needsConfirmation) setPendingConfirmation(true);
  };

  const handleMagicLink = async () => {
    if (!emailValid || busy) return;
    const ok = await run(() => sendSignInLink(email));
    if (ok) setLinkSent(true);
  };

  const handleForgotPassword = async () => {
    if (!emailValid || busy) return;
    const ok = await run(() => sendPasswordReset(email));
    if (ok) setResetSent(true);
  };

  if (mode === 'forgot') {
    return (
      <>
        <span className="onb-icon-badge"><FontAwesomeIcon icon={faEnvelope} /></span>
        <div className="onb-title">Reset Your Password</div>
        <div className="onb-desc">
          Enter your parent email and we'll send you a link to set a new password.
        </div>
        <input
          type="email"
          autoComplete="email"
          className="onb-input"
          placeholder="Parent email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); setResetSent(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleForgotPassword(); }}
        />
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
        <div className="onb-actions">
          <button className="btn btn-primary" onClick={handleForgotPassword} disabled={!emailValid || busy}>
            Send Reset Link
          </button>
          <button className="onb-link" onClick={() => { setMode('signin'); setError(null); setResetSent(false); }}>
            Back to sign in
          </button>
        </div>
      </>
    );
  }

  const handleResend = async () => {
    if (busy) return;
    setBusy(true);
    setResent(false);
    const res = await resendConfirmation(email);
    setBusy(false);
    if (res.ok) setResent(true);
    else setError(res.error);
  };

  // Signup succeeded but the project requires confirming email first — wait for the user to tap
  // the link (in any tab); `authUser` below will pick it up automatically once it does.
  if (pendingConfirmation && !authUser) {
    return (
      <>
        <span className="onb-icon-badge"><FontAwesomeIcon icon={faEnvelope} /></span>
        <div className="onb-title">Check Your Email</div>
        <div className="onb-desc">
          We sent a confirmation link to {email}. Tap it to finish creating your account — this
          screen will continue automatically, no need to come back here.
        </div>
        {error && (
          <div className="settings-sub sync-gate-status sync-gate-error">
            <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
          </div>
        )}
        {resent && !error && (
          <div className="settings-sub sync-gate-status">
            <FontAwesomeIcon icon={faEnvelope} /> Sent again — check your inbox.
          </div>
        )}
        <div className="onb-actions">
          <button className="btn btn-sm btn-ghost" onClick={handleResend} disabled={busy}>
            Resend confirmation email
          </button>
        </div>
      </>
    );
  }

  // Once signed in, confirm and let them continue into household setup.
  if (authUser) {
    return (
      <>
        <span className="onb-icon-badge"><FontAwesomeIcon icon={faCircleCheck} /></span>
        <div className="onb-title">You're Signed In</div>
        <div className="onb-desc">
          {mode === 'signup'
            ? `Signed in as ${authUser.email ?? 'your account'}. We'll get your family set up next.`
            : `Signed in as ${authUser.email ?? 'your account'}. We'll get you connected to your family next.`}
        </div>
        <div className="onb-actions">
          <button className="btn btn-primary" onClick={() => onDone(mode)}>Continue</button>
        </div>
      </>
    );
  }

  return (
    <>
      <span className="onb-icon-badge"><FontAwesomeIcon icon={faUserShield} /></span>
      <div className="onb-title">{mode === 'signup' ? 'Create a Parent Account' : 'Sign In'}</div>
      <div className="onb-desc">
        For grown-ups only. An account secures your family's data — you'll create or join a family
        right after this. We only store your email — never your child's information.
      </div>
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
      {mode === 'signin' && (
        <button className="onb-link" onClick={() => { setMode('forgot'); setError(null); }}>
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
          <FontAwesomeIcon icon={faEnvelope} /> Check your email and tap the link to finish signing
          in — this screen will continue automatically.
        </div>
      )}
      <div className="onb-actions">
        <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
        <button className="btn btn-sm btn-ghost" onClick={handleMagicLink} disabled={!emailValid || busy}>
          <FontAwesomeIcon icon={faEnvelope} /> Email me a sign-in link instead
        </button>
        <button className="onb-link" onClick={() => { setMode((m) => (m === 'signup' ? 'signin' : 'signup')); setError(null); }}>
          {mode === 'signup' ? 'Already have an account? Sign in' : 'No account yet? Create one'}
        </button>
      </div>
    </>
  );
}

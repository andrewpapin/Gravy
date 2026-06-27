import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faRightFromBracket, faEnvelope, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';

// Epic 8 — parent account (Supabase Auth). An account is a *parent* identity used for household
// ownership; it is independent of the kid-screen PIN. COPPA: this screen collects only a
// parent's email — never a child's name or data (that stays in-app after sign-in).
export function AccountPanel() {
  const { authUser, authReady, signUp, signIn, sendSignInLink, signOutAccount } = useGravy();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

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

  const handleSubmit = () => {
    if (!canSubmit) return;
    run(() => (mode === 'signup' ? signUp(email, password) : signIn(email, password)));
  };

  const handleMagicLink = async () => {
    if (!emailValid || busy) return;
    const ok = await run(() => sendSignInLink(email));
    if (ok) setLinkSent(true);
  };

  if (!authReady) {
    return (
      <div>
        <div className="section-label">Parent Account</div>
        <div className="settings-sub">Checking…</div>
      </div>
    );
  }

  if (authUser) {
    return (
      <div>
        <div className="section-label">Parent Account</div>
        <div className="settings-row settings-row--col">
          <div>
            <div className="settings-label">
              <FontAwesomeIcon icon={faUser} /> Signed in
            </div>
            <div className="settings-sub">{authUser.email ?? 'Your account'}</div>
          </div>
          <button className="btn btn-primary btn-ghost" onClick={() => void signOutAccount()}>
            <FontAwesomeIcon icon={faRightFromBracket} /> Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-label">Parent Account</div>
      <div className="settings-row settings-row--col">
        <div>
          <div className="settings-label">
            {mode === 'signup' ? 'Create a parent account' : 'Sign in'}
          </div>
          <div className="settings-sub">
            For grown-ups only. Securing your household with an account means only your devices can
            change it. We only store your email — never your child's information.
          </div>
        </div>
        <input
          type="email"
          autoComplete="email"
          placeholder="Parent email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); setLinkSent(false); }}
        />
        <input
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          placeholder="Password (at least 6 characters)"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        />
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
        <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
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
    </div>
  );
}

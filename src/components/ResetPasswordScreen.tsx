import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey, faCircleCheck, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';

// Mandatory full-screen overlay shown after a parent lands in the app via a password-reset
// email link (see onPasswordRecovery in state/auth.ts) — Supabase has already exchanged the
// link's token for a session, so this just collects the new password and applies it before
// letting the user back into the app.
export function ResetPasswordScreen() {
  const { updatePassword, clearPasswordRecovery } = useGravy();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit = password.length >= 6 && password === confirm && !busy;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const res = await updatePassword(password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
  };

  return (
    <div className="onb-screen">
      <div className="onb-content">
        {done ? (
          <>
            <span className="onb-icon-badge"><FontAwesomeIcon icon={faCircleCheck} /></span>
            <div className="onb-title">Password Updated</div>
            <div className="onb-desc">Your password has been changed. You're signed in and ready to go.</div>
            <div className="onb-actions">
              <button className="btn btn-primary" onClick={clearPasswordRecovery}>Continue</button>
            </div>
          </>
        ) : (
          <>
            <span className="onb-icon-badge"><FontAwesomeIcon icon={faKey} /></span>
            <div className="onb-title">Set a New Password</div>
            <div className="onb-desc">Choose a new password for your parent account.</div>
            <input
              type="password"
              autoComplete="new-password"
              className="onb-input"
              placeholder="New password (at least 6 characters)"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              autoFocus
            />
            <input
              type="password"
              autoComplete="new-password"
              className="onb-input"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
            {error && (
              <div className="settings-sub sync-gate-status sync-gate-error">
                <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
              </div>
            )}
            {!error && confirm.length > 0 && password !== confirm && (
              <div className="settings-sub sync-gate-status sync-gate-error">
                <FontAwesomeIcon icon={faTriangleExclamation} /> Passwords don't match
              </div>
            )}
            <div className="onb-actions">
              <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
                Save New Password
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

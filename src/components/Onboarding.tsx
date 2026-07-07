import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHandSparkles,
  faCloud,
  faChevronLeft,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import { ONBOARDING_DONE_KEY } from '../state/defaultState';
import { safeSetItem } from '../state/storage';
import { AccountSetupStep } from './AccountSetupStep';

// Three-way fork: a brand-new family (creates + owns a household), an existing parent setting up
// another device (signs in, then auto-attaches to their own household by account — falling back to
// a manual family code only if that lookup comes up empty), or a kid/family device that never gets
// an account at all (just enters the family code for kid-mode sync — settings stay locked on it,
// see isGrownUpUnlocked in state/auth.ts). The first kid's name and the guided app tour both happen
// AFTER this component hands off to the main app — see FirstKidPrompt/HomeTour, mounted from
// AppShell once onComplete reports whether this was a brand-new family.
type Phase = 'welcome' | 'account' | 'join' | 'creating';

export function Onboarding({ onComplete }: { onComplete: (result: { isNewFamily: boolean }) => void }) {
  const { createHousehold, joinHousehold, findMyHousehold, syncStatus } = useGravy();
  const [phase, setPhase] = useState<Phase>('welcome');
  const [accountInitialMode, setAccountInitialMode] = useState<'signup' | 'signin'>('signup');
  const [joinCode, setJoinCode] = useState('');
  const [joinHint, setJoinHint] = useState<string | null>(null);
  const [revealFailed, setRevealFailed] = useState(false);

  const syncing = syncStatus === 'syncing';

  const finish = (result: { isNewFamily: boolean }) => {
    safeSetItem(ONBOARDING_DONE_KEY, 'true');
    onComplete(result);
  };

  const startCreate = () => {
    setPhase('creating');
    setRevealFailed(false);
    createHousehold().then((result) => {
      if (result) finish({ isNewFamily: true });
      else setRevealFailed(true);
    });
  };

  const goJoin = (hint: string | null) => {
    setJoinHint(hint);
    setPhase('join');
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    joinHousehold(joinCode).then((ok) => {
      if (ok) finish({ isNewFamily: false });
    });
  };

  // Reported by AccountSetupStep once the parent is signed in — a brand-new account auto-creates
  // and owns a household; an existing account auto-attaches to its own household by account,
  // falling back to manual code entry only if that lookup finds nothing.
  const handleAccountDone = async (usedMode: 'signup' | 'signin') => {
    if (usedMode === 'signup') {
      startCreate();
      return;
    }
    setPhase('creating');
    setRevealFailed(false);
    const code = await findMyHousehold();
    const ok = code ? await joinHousehold(code) : false;
    if (ok) {
      finish({ isNewFamily: false });
      return;
    }
    goJoin("We couldn't find a household for your account yet — enter your family code below.");
  };

  const handleBack = () => {
    setJoinHint(null);
    setPhase('welcome');
  };

  const showBack = phase === 'account' || phase === 'join';

  return (
    <div className="onb-screen">
      {showBack && (
        <button className="onb-back" onClick={handleBack} aria-label="Back">
          <FontAwesomeIcon icon={faChevronLeft} /> Back
        </button>
      )}

      <div className="onb-content">
        {phase === 'welcome' && (
          <>
            <span className="onb-icon-badge"><FontAwesomeIcon icon={faHandSparkles} /></span>
            <div className="onb-wordmark">
              Gr<span className="onb-wordmark-accent">a</span>vy
            </div>
            <div className="onb-tagline">
              Turn chores, meals, and rewards into a game your kid actually wants to play.
            </div>
            <div className="onb-actions">
              <button
                className="btn btn-primary"
                onClick={() => { setAccountInitialMode('signup'); setPhase('account'); }}
              >
                New Family
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => { setAccountInitialMode('signin'); setPhase('account'); }}
              >
                Existing Parent
              </button>
              <button className="btn btn-ghost" onClick={() => goJoin(null)}>
                Existing Kid
              </button>
            </div>
          </>
        )}

        {phase === 'account' && <AccountSetupStep initialMode={accountInitialMode} onDone={handleAccountDone} />}

        {phase === 'join' && (
          <>
            <span className="onb-icon-badge"><FontAwesomeIcon icon={faCloud} /></span>
            <div className="onb-title">Join Your Family</div>
            <div className="onb-desc">{joinHint ?? 'Enter the code from another device to sync up.'}</div>
            <div className="flex-row-full sync-gate-join">
              <input
                type="text"
                className="onb-input"
                placeholder="Enter household code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                autoFocus
              />
              <button className="btn btn-primary" onClick={handleJoin} disabled={syncing || !joinCode.trim()}>
                Join
              </button>
            </div>
            {syncing && <div className="settings-sub sync-gate-status">Connecting…</div>}
            {!syncing && syncStatus === 'error' && (
              <div className="settings-sub sync-gate-status sync-gate-error">
                <FontAwesomeIcon icon={faTriangleExclamation} /> Couldn't connect — check the code and try again
              </div>
            )}
          </>
        )}

        {phase === 'creating' && (
          <>
            <span className="onb-icon-badge"><FontAwesomeIcon icon={faCloud} /></span>
            {revealFailed ? (
              <>
                <div className="onb-title">Couldn't Set Up Sync</div>
                <div className="settings-sub sync-gate-status sync-gate-error">
                  <FontAwesomeIcon icon={faTriangleExclamation} />{' '}
                  {navigator.onLine ? 'Server error' : 'No internet connection'} — try again
                </div>
                <div className="onb-actions">
                  <button className="btn btn-primary" onClick={startCreate}>
                    Try Again
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="onb-title">Setting Up…</div>
                <div className="onb-desc">One sec…</div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

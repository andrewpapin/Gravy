import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHandSparkles,
  faUtensils,
  faFire,
  faGift,
  faChild,
  faCloud,
  faChevronLeft,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { useGravy, SYNC_SKIPPED_KEY } from '../state/GravyContext';
import { isValidHouseholdCode } from '../state/sync';
import { ONBOARDING_DONE_KEY } from '../state/defaultState';

interface WalkStep {
  icon: typeof faHandSparkles;
  title: string;
  desc: (childName: string) => string;
}

const STEPS: WalkStep[] = [
  {
    icon: faHandSparkles,
    title: 'Welcome!',
    desc: (childName) => `Hey ${childName}! This is your Gravy — let's take a quick look around.`,
  },
  {
    icon: faUtensils,
    title: 'Earn Points',
    desc: () => 'Tap each food group you eat and finish your goals to earn points. Eat all 5 for a bonus!',
  },
  {
    icon: faFire,
    title: 'Build Your Streak',
    desc: () => 'Come back and log something every day to grow your streak and unlock badges.',
  },
  {
    icon: faGift,
    title: 'Visit the Store',
    desc: () => 'Trade your points for rewards in the Store. A grown-up approves each request.',
  },
];

type Phase = 'welcome' | 'join' | 'name' | 'walkthrough' | 'sync' | 'creating';
type JoinOrigin = 'welcome' | 'sync';

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { state, saveSetting, createHousehold, joinHousehold, syncStatus } = useGravy();
  const [phase, setPhase] = useState<Phase>('welcome');
  const [joinOrigin, setJoinOrigin] = useState<JoinOrigin>('welcome');
  const [walkStep, setWalkStep] = useState(0);
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [pendingCode, setPendingCode] = useState<string | undefined>(undefined);
  const [revealCode, setRevealCode] = useState<string | null>(null);
  const [revealFailed, setRevealFailed] = useState(false);

  const nameTrimmed = name.trim();
  const syncing = syncStatus === 'syncing';

  const finish = () => {
    localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    onComplete();
  };

  const startCreate = (code?: string) => {
    setPhase('creating');
    setRevealFailed(false);
    setPendingCode(code);
    createHousehold(code).then((result) => {
      if (result) setRevealCode(result);
      else setRevealFailed(true);
    });
  };

  const goJoin = (origin: JoinOrigin) => {
    setJoinOrigin(origin);
    setPhase('join');
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    joinHousehold(joinCode).then((ok) => {
      if (ok) finish();
    });
  };

  const handleNameNext = () => {
    if (!nameTrimmed) return;
    saveSetting('childName', nameTrimmed);
    setWalkStep(0);
    setPhase('walkthrough');
  };

  const handleWalkNext = () => {
    if (walkStep < STEPS.length - 1) {
      setWalkStep((s) => s + 1);
      return;
    }
    setPhase('sync');
  };

  const handleSkipForNow = () => {
    localStorage.setItem(SYNC_SKIPPED_KEY, 'true');
    finish();
  };

  const handleBack = () => {
    if (phase === 'join') {
      setPhase(joinOrigin);
    } else if (phase === 'name') {
      setPhase('welcome');
    } else if (phase === 'walkthrough') {
      if (walkStep === 0) setPhase('name');
      else setWalkStep((s) => s - 1);
    } else if (phase === 'sync') {
      setWalkStep(STEPS.length - 1);
      setPhase('walkthrough');
    }
  };

  const showBack = phase === 'join' || phase === 'name' || phase === 'walkthrough' || phase === 'sync';
  const showDots = phase === 'name' || phase === 'walkthrough' || phase === 'sync';
  const dotCount = STEPS.length + 2;
  const activeDot = phase === 'name' ? 0 : phase === 'walkthrough' ? walkStep + 1 : STEPS.length + 1;

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
              <button className="btn btn-primary" onClick={() => setPhase('name')}>
                Get Started
              </button>
            </div>
            <button className="onb-link" onClick={() => goJoin('welcome')}>
              Already set up on another device? Join your family
            </button>
          </>
        )}

        {phase === 'join' && (
          <>
            <span className="onb-icon-badge"><FontAwesomeIcon icon={faCloud} /></span>
            <div className="onb-title">Join Your Family</div>
            <div className="onb-desc">Enter the code from another device to sync up.</div>
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

        {phase === 'name' && (
          <>
            <span className="onb-icon-badge"><FontAwesomeIcon icon={faChild} /></span>
            <div className="onb-title">What's your kiddo's name?</div>
            <div className="onb-desc">We'll use it to say hi and cheer them on.</div>
            <input
              type="text"
              className="onb-input"
              maxLength={20}
              placeholder="e.g. Zack"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNameNext(); }}
              autoFocus
            />
          </>
        )}

        {phase === 'walkthrough' && (
          <>
            <span className="onb-icon-badge"><FontAwesomeIcon icon={STEPS[walkStep].icon} /></span>
            <div className="onb-title">{STEPS[walkStep].title}</div>
            <div className="onb-desc">{STEPS[walkStep].desc(state.settings.childName)}</div>
          </>
        )}

        {phase === 'sync' && (
          <>
            <span className="onb-icon-badge"><FontAwesomeIcon icon={faCloud} /></span>
            <div className="onb-title">Keep the Family in Sync</div>
            <div className="onb-desc">
              Create a code so grown-ups' phones can follow along with {state.settings.childName}'s progress.
              You can always do this later from Settings.
            </div>
          </>
        )}

        {phase === 'creating' && (
          <>
            <span className="onb-icon-badge"><FontAwesomeIcon icon={faCloud} /></span>
            {revealCode ? (
              <>
                <div className="onb-title">Your Family Code</div>
                <div className="onb-desc">Enter this on another device to keep everyone in sync.</div>
                <div className="household-code-display">{revealCode}</div>
              </>
            ) : revealFailed ? (
              <>
                <div className="onb-title">Couldn't Set Up Sync</div>
                <div className="settings-sub sync-gate-status sync-gate-error">
                  <FontAwesomeIcon icon={faTriangleExclamation} />{' '}
                  {navigator.onLine ? 'Server error' : 'No internet connection'} — try again
                </div>
              </>
            ) : (
              <>
                <div className="onb-title">Setting Up Sync…</div>
                <div className="onb-desc">One sec…</div>
              </>
            )}
          </>
        )}

        {showDots && (
          <div className="onb-dots">
            {Array.from({ length: dotCount }).map((_, i) => (
              <span key={i} className={`onb-dot ${i === activeDot ? 'active' : ''}`} />
            ))}
          </div>
        )}

        {phase === 'name' && (
          <div className="onb-actions">
            <button className="btn btn-primary" onClick={handleNameNext} disabled={!nameTrimmed}>
              Next
            </button>
          </div>
        )}
        {phase === 'walkthrough' && (
          <div className="onb-actions">
            <button className="btn btn-primary" onClick={handleWalkNext}>
              {walkStep === STEPS.length - 1 ? 'Continue' : 'Next'}
            </button>
          </div>
        )}
        {phase === 'sync' && (
          <div className="onb-actions">
            <button className="btn btn-primary" onClick={() => startCreate()}>
              <FontAwesomeIcon icon={faCloud} /> Create Household
            </button>
            <div className="flex-row-full sync-gate-join">
              <input
                type="text"
                className="onb-input"
                placeholder="Or pick your own code"
                maxLength={6}
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              />
              <button className="btn btn-primary" onClick={() => startCreate(customCode)} disabled={!isValidHouseholdCode(customCode)}>
                Create
              </button>
            </div>
            <div className="settings-sub">6 characters — no 0, O, 1, or I</div>
            <button className="onb-link" onClick={() => goJoin('sync')}>
              Have a code already? Join instead
            </button>
            <button className="btn btn-sm btn-ghost" onClick={handleSkipForNow}>
              Skip for now — just use this device
            </button>
          </div>
        )}
        {phase === 'creating' && revealCode && (
          <div className="onb-actions">
            <button className="btn btn-primary" onClick={finish}>
              Let's go!
            </button>
          </div>
        )}
        {phase === 'creating' && revealFailed && (
          <div className="onb-actions">
            <button className="btn btn-primary" onClick={() => startCreate(pendingCode)}>
              Try Again
            </button>
            <button className="btn btn-sm btn-ghost" onClick={handleSkipForNow}>
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

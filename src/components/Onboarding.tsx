import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandSparkles, faUtensils, faFire, faGift, faChild, faChevronLeft, faChevronRight, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';

export const ONBOARDING_DONE_KEY = 'gravy_onboarded';

interface Step {
  icon: typeof faHandSparkles;
  title: string;
  desc: (childName: string) => string;
}

const STEPS: Step[] = [
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

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { state, saveSetting } = useGravy();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const totalSteps = STEPS.length + 1;
  const onNameStep = step === 0;
  const last = step === totalSteps - 1;
  const current = onNameStep ? null : STEPS[step - 1];
  const nameTrimmed = name.trim();
  const canAdvance = !onNameStep || nameTrimmed.length > 0;

  const finish = () => {
    localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    onComplete();
  };

  const handleNext = () => {
    if (!canAdvance) return;
    if (onNameStep && nameTrimmed) saveSetting('childName', nameTrimmed);
    if (last) finish();
    else setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="sync-gate-overlay onboarding-overlay">
      <button
        className="onboarding-arrow onboarding-arrow-left"
        onClick={handleBack}
        aria-label="Back"
        style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
      >
        <FontAwesomeIcon icon={faChevronLeft} />
      </button>

      <div className="badge-popup sync-gate-card">
        {onNameStep ? (
          <>
            <span className="badge-popup-icon"><FontAwesomeIcon icon={faChild} /></span>
            <div className="badge-popup-name">What's your kiddo's name?</div>
            <div className="badge-popup-desc">We'll use it to say hi and cheer them on.</div>
            <input
              type="text"
              className="onboarding-name-input"
              maxLength={20}
              placeholder="e.g. Maya"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
              autoFocus
            />
          </>
        ) : (
          <>
            <span className="badge-popup-icon"><FontAwesomeIcon icon={current!.icon} /></span>
            <div className="badge-popup-name">{current!.title}</div>
            <div className="badge-popup-desc">{current!.desc(state.settings.childName)}</div>
          </>
        )}
        <div className="onboarding-dots">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>
        <button className="btn btn-primary" onClick={handleNext} disabled={!canAdvance}>
          {last ? "Let's go!" : 'Next'}
        </button>
        {!last && (
          <button className="btn btn-sm btn-ghost sync-gate-skip" onClick={finish}>
            Skip
          </button>
        )}
      </div>

      <button
        className="onboarding-arrow onboarding-arrow-right"
        onClick={handleNext}
        disabled={!canAdvance}
        aria-label={last ? "Finish" : 'Next'}
      >
        <FontAwesomeIcon icon={last ? faCheck : faChevronRight} />
      </button>
    </div>
  );
}

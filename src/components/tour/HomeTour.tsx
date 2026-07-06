import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useGravy } from '../../state/GravyContext';
import { HOME_TOUR_DONE_KEY } from '../../state/defaultState';
import { safeSetItem } from '../../state/storage';
import { TOUR_STEPS } from '../../data/tourSteps';
import { Spotlight } from './Spotlight';
import { placementFor } from './placement';

// First-run guided tour: spotlights real home-screen elements (via data-tour-id) one at a time,
// mounted on top of the already-live HomeScreen from AppShell once onboarding completes. Runs
// once per device across every onboarding path (see AppShell's HOME_TOUR_DONE_KEY bypass).
export function HomeTour({ onDone }: { onDone: () => void }) {
  const { householdCode } = useGravy();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = TOUR_STEPS[stepIndex];

  const measure = useCallback(() => {
    if (!step.targetId) { setRect(null); return; }
    const el = document.querySelector(`[data-tour-id="${step.targetId}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  // Measuring the target's real layout position only exists once it's painted — this is the
  // sanctioned "measure before paint" use of useLayoutEffect, same pattern already accepted at
  // useHouseholdSync.ts:94.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measure();
  }, [measure]);

  useEffect(() => {
    const scrollArea = document.querySelector('.scroll-area');
    const onReflow = () => measure();
    window.addEventListener('resize', onReflow);
    scrollArea?.addEventListener('scroll', onReflow, { passive: true });

    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    if (step.targetId) {
      const el = document.querySelector(`[data-tour-id="${step.targetId}"]`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      // Re-measure once the smooth scroll has had time to settle.
      settleTimer = setTimeout(measure, 350);
    }
    return () => {
      window.removeEventListener('resize', onReflow);
      scrollArea?.removeEventListener('scroll', onReflow);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [step, measure]);

  const finishTour = () => {
    safeSetItem(HOME_TOUR_DONE_KEY, 'true');
    onDone();
  };

  const next = () => {
    if (stepIndex < TOUR_STEPS.length - 1) setStepIndex((i) => i + 1);
    else finishTour();
  };

  const placement = rect ? placementFor(rect) : 'center';
  const calloutStyle: CSSProperties = rect
    ? placement === 'above'
      ? { bottom: window.innerHeight - rect.top + 16 }
      : { top: rect.bottom + 16 }
    : {};

  return (
    <div className="tour-overlay">
      <Spotlight rect={rect} />
      <div className={`tour-callout tour-callout-${placement}`} style={calloutStyle}>
        <div className="tour-callout-header">
          <span className="tour-callout-icon"><FontAwesomeIcon icon={step.icon} /></span>
          <div className="tour-callout-title">{step.title}</div>
        </div>
        <div className="tour-callout-desc">{step.desc(householdCode)}</div>
        <div className="tour-dots">
          {TOUR_STEPS.map((_, i) => (
            <span key={i} className={`onb-dot ${i === stepIndex ? 'active' : ''}`} />
          ))}
        </div>
        <div className="tour-callout-actions">
          <button className="onb-link" onClick={finishTour}>Skip</button>
          <button className="btn btn-primary btn-sm" onClick={next}>
            {stepIndex === TOUR_STEPS.length - 1 ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

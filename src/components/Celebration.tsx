import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useGravy } from '../state/GravyContext';

// The overlay is `pointer-events: all` for the whole of its --transition-slow (0.3s) fade-in,
// during which it's still nearly invisible. Without this delay a tap aimed at the button
// underneath lands on a scrim the kid can't see yet and silently dismisses it — which reads as
// "my tap did nothing". Slightly longer than the fade so the overlay is legible before it
// accepts a dismiss.
const DISMISS_ARM_MS = 350;

export function Celebration() {
  const { celebration, hideCelebration } = useGravy();
  const overlayRef = useRef<HTMLDivElement>(null);
  // A ref, not state — arming only gates the dismiss handler, so there's nothing to re-render.
  const shownAtRef = useRef(0);

  useEffect(() => {
    if (!celebration) return;
    shownAtRef.current = Date.now();
    overlayRef.current?.focus();
  }, [celebration]);

  const dismiss = () => {
    if (Date.now() - shownAtRef.current < DISMISS_ARM_MS) return;
    hideCelebration();
  };

  return (
    <div
      className={`celebration ${celebration ? 'show' : ''}`}
      onClick={dismiss}
      role={celebration ? 'button' : undefined}
      tabIndex={celebration ? 0 : -1}
      aria-label="Dismiss celebration"
      ref={overlayRef}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dismiss();
        }
      }}
    >
      {celebration && (
        <>
          <div className="celebration-icon">
            {typeof celebration.icon === 'string' ? celebration.icon : <FontAwesomeIcon icon={celebration.icon} />}
          </div>
          <div className="celebration-title">{celebration.title}</div>
          <div className="celebration-sub">{celebration.sub}</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 700, marginTop: 16 }}>
            Tap to continue
          </div>
        </>
      )}
    </div>
  );
}

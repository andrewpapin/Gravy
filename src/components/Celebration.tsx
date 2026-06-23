import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useGravy } from '../state/GravyContext';

export function Celebration() {
  const { celebration, hideCelebration } = useGravy();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (celebration) overlayRef.current?.focus();
  }, [celebration]);

  return (
    <div
      className={`celebration ${celebration ? 'show' : ''}`}
      onClick={hideCelebration}
      role={celebration ? 'button' : undefined}
      tabIndex={celebration ? 0 : -1}
      aria-label="Dismiss celebration"
      ref={overlayRef}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          hideCelebration();
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

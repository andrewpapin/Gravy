import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useGrubClub } from '../state/GrubClubContext';

export function Celebration() {
  const { celebration, hideCelebration } = useGrubClub();
  return (
    <div className={`celebration ${celebration ? 'show' : ''}`} onClick={hideCelebration}>
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

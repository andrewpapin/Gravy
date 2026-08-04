import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';

// Persistent (not dismissible) reminder that the household on screen is the shared, live Demo
// Mode household — every visitor who clicks "Try Demo" joins the same real Supabase row, so
// nothing here is private, and it gets reseeded on a schedule (see supabase/functions/reseed-demo).
export function DemoModeBanner() {
  const { demoMode, exitDemoMode } = useGravy();
  if (!demoMode) return null;

  return (
    <div className="demo-mode-banner">
      <FontAwesomeIcon icon={faWandMagicSparkles} />
      <span>Shared Demo — everyone sees this household</span>
      <button type="button" className="btn btn-sm btn-ghost" onClick={exitDemoMode}>
        Exit
      </button>
    </div>
  );
}

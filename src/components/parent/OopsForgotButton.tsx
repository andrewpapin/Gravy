import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClockRotateLeft, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { getDayLog, hasLoggedItems } from '../../state/dayLog';
import { todayStr } from '../../state/defaultState';
import { getAverageDailyPoints } from '../../state/statsSnapshot';
import { triggerHaptic } from '../../lib/haptics';

interface OopsForgotButtonProps {
  dateStr: string;
}

// Calendar-only catch-up: awards the kid's rolling-30-day average in one tap for a past day
// nothing was logged on, standing in for a whole day's activity rather than a specific item.
// Tapping it again undoes it. Disabled (can't apply) once any real food/goal/bonus item has
// been logged for the day, so it never stacks with the normal per-item editors.
export function OopsForgotButton({ dateStr }: OopsForgotButtonProps) {
  const { state, addOopsPointsForDay, undoOopsPointsForDay } = useGravy();
  const today = todayStr(state.settings.timezone);
  const log = getDayLog(state, dateStr, today);
  const applied = log?.oopsPoints;
  const alreadyLogged = hasLoggedItems(log);
  const avgPts = Math.round(getAverageDailyPoints(state, 30));

  if (applied !== undefined) {
    return (
      <button
        type="button"
        className="btn btn-green oops-forgot-btn"
        onClick={() => { triggerHaptic(); undoOopsPointsForDay(dateStr); }}
        aria-label={`Oops points added, +${applied}. Tap to undo.`}
      >
        <FontAwesomeIcon icon={faRotateLeft} aria-hidden="true" />
        Oops points added (+{applied}) — tap to undo
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-primary oops-forgot-btn"
      disabled={alreadyLogged}
      onClick={() => { triggerHaptic(); addOopsPointsForDay(dateStr); }}
      aria-label={
        alreadyLogged
          ? "Oops button unavailable — this day already has logged activity."
          : `Oops, I forgot to log this day. Tap to add ${avgPts} points.`
      }
      title={alreadyLogged ? "Already has activity logged for this day" : undefined}
    >
      <FontAwesomeIcon icon={faClockRotateLeft} aria-hidden="true" />
      Oops, I forgot… +{avgPts}
    </button>
  );
}

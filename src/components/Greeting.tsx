import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../state/GravyContext';
import { formatFriendlyDate, formatShortDate } from '../state/defaultState';

function getGreeting(timezone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hourCycle: 'h23' }).format(new Date()),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

interface GreetingProps {
  dateStr: string;
  isToday: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
}

export function Greeting({ dateStr, isToday, onPrevDay, onNextDay }: GreetingProps) {
  const { state } = useGravy();
  const timezone = state.settings.timezone;

  return (
    <div className="home-greeting">
      {!isToday && (
        <div className="home-history-banner">Viewing {formatShortDate(dateStr)} — not today</div>
      )}
      <div className="home-greeting-name">
        {getGreeting(timezone)}, {state.settings.childName}!
        {!isToday && ` Here's your progress for ${formatShortDate(dateStr)}.`}
      </div>
      <div className="home-date-nav">
        <button className="home-date-nav-btn" onClick={onPrevDay} aria-label="Previous day" type="button">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <span className="home-greeting-date">{formatFriendlyDate(dateStr)}</span>
        {!isToday && (
          <button className="home-date-nav-btn" onClick={onNextDay} aria-label="Next day" type="button">
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        )}
      </div>
    </div>
  );
}

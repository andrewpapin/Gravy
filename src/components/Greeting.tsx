import { useGravy } from '../state/GravyContext';
import { formatFriendlyDate } from '../state/defaultState';

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
}

export function Greeting({ dateStr }: GreetingProps) {
  const { state } = useGravy();
  const timezone = state.settings.timezone;

  return (
    <div className="home-greeting">
      <div className="home-greeting-name">
        {getGreeting(timezone)}, {state.settings.childName}!
      </div>
      <div className="home-greeting-date">{formatFriendlyDate(dateStr)}</div>
    </div>
  );
}

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse } from '@fortawesome/free-solid-svg-icons';
import { TopBar } from './TopBar';
import { StatsCard } from './StatsCard';
import { GamesCard } from './GamesCard';
import { FoodTray } from './FoodTray';
import { DailyGoals } from './DailyGoals';
import { BonusPoints } from './BonusPoints';
import { HistoryScreen } from './HistoryScreen';
import { useGravy } from '../state/GravyContext';
import { todayStr, formatShortDate } from '../state/defaultState';

interface HomeScreenProps {
  onOpenAvatarMenu: () => void;
  onOpenBadges: () => void;
  onOpenGames: () => void;
  onOpenRank: () => void;
}

export function HomeScreen({ onOpenAvatarMenu, onOpenBadges, onOpenGames, onOpenRank }: HomeScreenProps) {
  const { state } = useGravy();
  const today = todayStr(state.settings.timezone);
  // null means "follow today live" — set to a concrete date once the user navigates away
  // from today, and back to null once they return to it (via the calendar picker or the
  // FAB), so day rollover keeps working without this getting stuck on a stale "today" string.
  const [viewedDate, setViewedDate] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const dateStr = viewedDate ?? today;
  const isToday = dateStr === today;

  const goToDate = (target: string) => setViewedDate(target === today ? null : target);

  return (
    <div className="screen active">
      <TopBar
        dateStr={dateStr}
        onOpenAvatarMenu={onOpenAvatarMenu}
        onOpenHistory={() => setHistoryOpen(true)}
      />
      <div className="scroll-area">
        {!isToday && (
          <div className="home-history-banner">Viewing {formatShortDate(dateStr)} — not today</div>
        )}
        <StatsCard onOpenBadges={onOpenBadges} onOpenRank={onOpenRank} />
        <GamesCard onOpen={onOpenGames} />
        <FoodTray dateStr={dateStr} editable={isToday} />
        <DailyGoals dateStr={dateStr} editable={isToday} />
        <BonusPoints dateStr={dateStr} editable={isToday} />
      </div>
      {!isToday && (
        <button className="return-today-fab" onClick={() => setViewedDate(null)} type="button">
          <FontAwesomeIcon icon={faHouse} aria-hidden="true" /> Return to Today
        </button>
      )}
      <HistoryScreen
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onPickDate={goToDate}
      />
    </div>
  );
}

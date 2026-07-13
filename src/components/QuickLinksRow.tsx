import { GamesCard } from './GamesCard';
import { StatsPill } from './StatsPill';
import { PrizesPill } from './PrizesPill';

interface QuickLinksRowProps {
  onOpenDailyGame: () => void;
  onOpenRank: () => void;
  onOpenStore: () => void;
}

export function QuickLinksRow({ onOpenDailyGame, onOpenRank, onOpenStore }: QuickLinksRowProps) {
  return (
    <div className="pill-row">
      <GamesCard onOpen={onOpenDailyGame} />
      <StatsPill onOpen={onOpenRank} />
      <PrizesPill onOpen={onOpenStore} />
    </div>
  );
}

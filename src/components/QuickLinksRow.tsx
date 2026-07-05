import { GamesCard } from './GamesCard';
import { StatsPill } from './StatsPill';
import { PrizesPill } from './PrizesPill';

interface QuickLinksRowProps {
  onOpenGames: () => void;
  onOpenRank: () => void;
  onOpenStore: () => void;
}

export function QuickLinksRow({ onOpenGames, onOpenRank, onOpenStore }: QuickLinksRowProps) {
  return (
    <div className="pill-row">
      <GamesCard onOpen={onOpenGames} />
      <StatsPill onOpen={onOpenRank} />
      <PrizesPill onOpen={onOpenStore} />
    </div>
  );
}

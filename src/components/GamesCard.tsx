import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGamepad } from '@fortawesome/free-solid-svg-icons';
import { pressable } from '../lib/pressable';

interface GamesCardProps {
  onOpen: () => void;
}

export function GamesCard({ onOpen }: GamesCardProps) {
  return (
    <button className="home-pill home-pill-daily" {...pressable(onOpen)} type="button" data-tour-id="games">
      <FontAwesomeIcon icon={faGamepad} />
      <span>Daily</span>
    </button>
  );
}

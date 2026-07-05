import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGamepad } from '@fortawesome/free-solid-svg-icons';

interface GamesCardProps {
  onOpen: () => void;
}

export function GamesCard({ onOpen }: GamesCardProps) {
  return (
    <button className="home-pill home-pill-daily" onClick={onOpen} type="button">
      <FontAwesomeIcon icon={faGamepad} />
      <span>Daily</span>
    </button>
  );
}

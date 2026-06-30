import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGamepad, faChevronRight } from '@fortawesome/free-solid-svg-icons';

interface GamesCardProps {
  onOpen: () => void;
}

export function GamesCard({ onOpen }: GamesCardProps) {
  return (
    <button className="games-card" onClick={onOpen} type="button">
      <span className="games-card-icon-circle">
        <FontAwesomeIcon icon={faGamepad} />
      </span>
      <span className="games-card-info">
        <span className="games-card-title">Arcade</span>
        <span className="games-card-sub">Play & earn points!</span>
      </span>
      <FontAwesomeIcon icon={faChevronRight} />
    </button>
  );
}

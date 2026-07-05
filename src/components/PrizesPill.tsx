import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGift } from '@fortawesome/free-solid-svg-icons';

interface PrizesPillProps {
  onOpen: () => void;
}

export function PrizesPill({ onOpen }: PrizesPillProps) {
  return (
    <button className="home-pill home-pill-prizes" onClick={onOpen} type="button">
      <FontAwesomeIcon icon={faGift} />
      <span>Prizes</span>
    </button>
  );
}

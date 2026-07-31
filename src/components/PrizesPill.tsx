import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGift } from '@fortawesome/free-solid-svg-icons';
import { pressable } from '../lib/pressable';

interface PrizesPillProps {
  onOpen: () => void;
}

export function PrizesPill({ onOpen }: PrizesPillProps) {
  return (
    <button className="home-pill home-pill-prizes" {...pressable(onOpen)} type="button" data-tour-id="store">
      <FontAwesomeIcon icon={faGift} />
      <span>Prizes</span>
    </button>
  );
}

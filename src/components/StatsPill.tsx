import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';
import { pressable } from '../lib/pressable';

interface StatsPillProps {
  onOpen: () => void;
}

export function StatsPill({ onOpen }: StatsPillProps) {
  return (
    <button className="home-pill home-pill-stats" {...pressable(onOpen)} type="button" data-tour-id="stats">
      <FontAwesomeIcon icon={faTrophy} />
      <span>Stats</span>
    </button>
  );
}

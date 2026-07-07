import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';

interface StatsPillProps {
  onOpen: () => void;
}

export function StatsPill({ onOpen }: StatsPillProps) {
  return (
    <button className="home-pill home-pill-stats" onClick={onOpen} type="button" data-tour-id="stats">
      <FontAwesomeIcon icon={faTrophy} />
      <span>Stats</span>
    </button>
  );
}

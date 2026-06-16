import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear } from '@fortawesome/free-solid-svg-icons';

interface ParentTopBarProps {
  onExit: () => void;
}

export function ParentTopBar({ onExit }: ParentTopBarProps) {
  return (
    <div className="parent-topbar">
      <div className="parent-topbar-title">
        <FontAwesomeIcon icon={faGear} /> Parent Dashboard
      </div>
      <button className="parent-topbar-exit-btn" onClick={onExit}>
        ← Exit
      </button>
    </div>
  );
}

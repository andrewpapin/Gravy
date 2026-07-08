import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { useSwipeReveal, SWIPE_REVEAL_WIDTH } from './useSwipeReveal';

interface SwipeToDeleteRowProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  removeLabel: string;
  children: ReactNode;
}

// Wraps a .settings-row's content so it can be swiped left to reveal a trash button
// (tapping the button opens the caller's own confirm-delete flow — swiping never deletes
// by itself). See src/components/useSwipeReveal.ts for the gesture state machine.
export function SwipeToDeleteRow({ isOpen, onOpenChange, onDelete, removeLabel, children }: SwipeToDeleteRowProps) {
  const { offset, isSettled, contentHandlers } = useSwipeReveal({ isOpen, onOpenChange });

  return (
    <div className="settings-row settings-row--swipe">
      <div className="swipe-row-reveal" style={{ width: SWIPE_REVEAL_WIDTH }}>
        <button
          type="button"
          className="swipe-row-delete-btn"
          aria-label={removeLabel}
          title="Remove"
          onClick={onDelete}
          onFocus={() => onOpenChange(true)}
        >
          <FontAwesomeIcon icon={faTrashCan} />
        </button>
      </div>
      <div
        className={`swipe-row-content${isSettled ? ' swipe-row-content--settled' : ''}`}
        style={{ transform: `translateX(-${offset}px)` }}
        {...contentHandlers}
      >
        {children}
      </div>
    </div>
  );
}

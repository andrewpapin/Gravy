import { useCallback, useRef, useState } from 'react';

export const SWIPE_REVEAL_WIDTH = 68;

const AXIS_LOCK_THRESHOLD = 8;
const OPEN_SNAP_RATIO = 0.35;

interface UseSwipeRevealOptions {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  revealWidth?: number;
}

// Hand-rolled swipe-to-reveal gesture (no gesture library in this repo). Uses Pointer Events
// so the same handlers cover touch, mouse, and the Capacitor-wrapped native build. Axis-locks
// after a small threshold so a mostly-vertical drag falls through to native scrolling (backed
// by touch-action: pan-y on the content layer) instead of being hijacked.
export function useSwipeReveal({ isOpen, onOpenChange, revealWidth = SWIPE_REVEAL_WIDTH }: UseSwipeRevealOptions) {
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const baseOffset = useRef(0);
  const axisLocked = useRef<'x' | 'y' | null>(null);
  const wasDragRef = useRef(false);
  const wasOpenAtDownRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (pointerIdRef.current !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    baseOffset.current = isOpen ? revealWidth : 0;
    axisLocked.current = null;
    wasDragRef.current = false;
    wasOpenAtDownRef.current = isOpen;
    pointerIdRef.current = e.pointerId;
    // Deliberately do NOT capture the pointer here: setPointerCapture retargets the
    // *derived mouse events* (mousedown/mouseup/click) to this element too, which would
    // stop a plain tap from ever reaching a nested button/input. Capture is acquired lazily
    // in onPointerMove, only once a real horizontal drag is confirmed.
  }, [isOpen, revealWidth]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (axisLocked.current === null) {
      if (Math.abs(dx) < AXIS_LOCK_THRESHOLD && Math.abs(dy) < AXIS_LOCK_THRESHOLD) return;
      axisLocked.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (axisLocked.current === 'x') {
        wasDragRef.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    }
    if (axisLocked.current !== 'x') return;
    e.preventDefault();
    setDragOffset(Math.min(revealWidth, Math.max(0, baseOffset.current - dx)));
  }, [revealWidth]);

  const endDrag = useCallback((e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    if (axisLocked.current === 'x') {
      const finalOffset = dragOffset ?? baseOffset.current;
      onOpenChange(finalOffset > revealWidth * OPEN_SNAP_RATIO);
    }
    setDragOffset(null);
    axisLocked.current = null;
    const target = e.currentTarget as HTMLElement;
    if (target.hasPointerCapture?.(e.pointerId)) target.releasePointerCapture(e.pointerId);
    pointerIdRef.current = null;
  }, [dragOffset, onOpenChange, revealWidth]);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    // The browser fires a trailing synthetic click after a real drag release — swallow it
    // without touching open/closed state, since endDrag already decided that. A plain tap on
    // a row that was open when the gesture started closes it instead of firing its normal
    // action — checked against wasOpenAtDownRef (snapshot at pointerdown), not live `isOpen`,
    // because the button's own native focus-on-mousedown can already flip `isOpen` via
    // onFocusCapture before this click handler runs.
    if (wasDragRef.current) {
      e.preventDefault();
      e.stopPropagation();
      wasDragRef.current = false;
      return;
    }
    if (wasOpenAtDownRef.current) {
      e.preventDefault();
      e.stopPropagation();
      onOpenChange(false);
    }
  }, [onOpenChange]);

  const onFocusCapture = useCallback((e: React.FocusEvent) => {
    if (isOpen) {
      (e.target as HTMLElement).blur();
      onOpenChange(false);
    }
  }, [isOpen, onOpenChange]);

  const offset = dragOffset ?? (isOpen ? revealWidth : 0);

  return {
    offset,
    isSettled: dragOffset === null,
    contentHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClickCapture,
      onFocusCapture,
    },
  };
}

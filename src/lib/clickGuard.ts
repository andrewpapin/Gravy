import { useRef } from 'react';

// Swallows a repeat invocation for the same key within `windowMs` of the last one. Used on
// toggle-style buttons (mark done / undo) where a rapid double-tap — a real touchscreen
// double-fire, not necessarily two deliberate taps — would otherwise call complete-then-undo
// (or the reverse) and cancel itself out, making the tap look like it silently did nothing.
export function useClickGuard(windowMs = 300) {
  const lastFiredRef = useRef<Map<string | number, number>>(new Map());

  return (key: string | number, fn: () => void) => {
    const now = Date.now();
    const last = lastFiredRef.current.get(key) ?? 0;
    if (now - last < windowMs) return;
    lastFiredRef.current.set(key, now);
    fn();
  };
}

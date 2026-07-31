import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { triggerHaptic } from './haptics';
import { lastScrollAt } from './scrollActivity';
import { shouldFirePress, CLICK_FALLBACK_SUPPRESS_MS, CLICK_SWALLOW_MS } from './pressGesture';

// Spreadable handler props that make a control fire reliably on the first tap.
//
// Plain `onClick` is unreliable on touch inside a scrolling list: WebKit cancels the
// synthesized click when the finger drifts a few pixels, so the tap "flashes" (the :active
// style paints) and nothing happens. These handlers decide at pointerup instead, using our own
// movement tolerance (see ./pressGesture.ts), while still cancelling on a genuine scroll so a
// flick never logs a goal.
//
// Deliberately a plain function, not a hook: it's called once per row/tile inside `.map()` in
// FoodTray/DailyGoals/BonusPoints, which the Rules of Hooks forbid. Per-control gesture state
// therefore lives in a WeakMap keyed by the DOM element — the natural identity for it, and it
// is collected with the element.

export interface PressableOptions {
  /** Skip firing entirely. Mirrors the element's own `disabled`/locked state. */
  disabled?: boolean;
  /**
   * Minimum gap between two accepted presses on this control. Left at 0 for steppers (which
   * should stay rapid-fire) and set on toggles, where a fast second tap would silently undo
   * the first and read as "nothing happened".
   */
  cooldownMs?: number;
  /** Set false to suppress the vibration (no-op on iOS, which lacks `navigator.vibrate`). */
  haptic?: boolean;
}

export interface PressableProps {
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
  onPointerCancel: (e: ReactPointerEvent) => void;
  onClick: (e: ReactMouseEvent) => void;
}

interface PressState {
  gesture: { pointerId: number; x: number; y: number; scrollAt: number } | null;
  /** When this control last fired. Drives `cooldownMs`. */
  lastFireAt: number;
  /** When a pointer last touched this control, whether or not the press went on to fire. */
  lastPointerAt: number;
}

const states = new WeakMap<Element, PressState>();

/**
 * Eats the one `click` the browser dispatches after the pointerup we just acted on.
 *
 * Acting at pointerup means the UI has already changed by the time that click is hit-tested, so
 * it lands on whatever is now under the finger. When the press opened a drawer, that's the
 * drawer's own scrim — whose click-to-close handler would shut it again the instant it opened.
 * Capture phase, so it never reaches React's delegated handlers.
 */
function swallowNextClick(): void {
  let timer = 0;
  const swallow = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    cleanup();
  };
  const cleanup = () => {
    document.removeEventListener('click', swallow, true);
    window.clearTimeout(timer);
  };
  timer = window.setTimeout(cleanup, CLICK_SWALLOW_MS);
  document.addEventListener('click', swallow, true);
}

function stateFor(el: Element): PressState {
  let s = states.get(el);
  if (!s) {
    s = { gesture: null, lastFireAt: -Infinity, lastPointerAt: -Infinity };
    states.set(el, s);
  }
  return s;
}

export function pressable(onPress: () => void, options: PressableOptions = {}): PressableProps {
  const { disabled = false, cooldownMs = 0, haptic = true } = options;

  return {
    onPointerDown: (e) => {
      if (disabled) return;
      // Ignore secondary mouse buttons and every touch after the first.
      if (!e.isPrimary || e.button !== 0) return;
      const state = stateFor(e.currentTarget);
      state.lastPointerAt = Date.now();
      state.gesture = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        scrollAt: lastScrollAt(),
      };
    },

    onPointerUp: (e) => {
      if (disabled) return;
      const state = stateFor(e.currentTarget);
      const gesture = state.gesture;
      state.gesture = null;
      if (!gesture || gesture.pointerId !== e.pointerId) return;

      const fires = shouldFirePress({
        dx: e.clientX - gesture.x,
        dy: e.clientY - gesture.y,
        scrolledDuringPress: lastScrollAt() !== gesture.scrollAt,
        msSinceLastFire: Date.now() - state.lastFireAt,
        cooldownMs,
      });
      if (!fires) return;

      state.lastFireAt = Date.now();
      swallowNextClick();
      if (haptic) triggerHaptic();
      onPress();
    },

    onPointerCancel: (e) => {
      stateFor(e.currentTarget).gesture = null;
    },

    // Fallback for activations that produce a click with no pointer gesture behind it —
    // keyboard Enter/Space, VoiceOver, and any browser without pointer events.
    //
    // Keyed off the last *pointer contact*, not the last fire: a click that follows a gesture we
    // deliberately rejected (drifted too far, or landed mid-scroll) belongs to that gesture, and
    // running it here would undo the rejection. Programmatic scrolling doesn't cancel the
    // browser's click the way finger-driven scrolling does, so that case is real.
    onClick: (e) => {
      if (disabled) return;
      const state = stateFor(e.currentTarget);
      if (Date.now() - state.lastPointerAt < CLICK_FALLBACK_SUPPRESS_MS) return;
      state.lastFireAt = Date.now();
      state.lastPointerAt = Date.now();
      onPress();
    },
  };
}

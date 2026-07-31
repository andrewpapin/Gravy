// Pure decision logic behind `usePressable` (./usePressable.ts), kept separate so it can be
// unit-tested without a DOM.
//
// Why this exists: every home-screen control used to fire on a plain React `onClick`. Inside
// the scrolling card area that's unreliable on touch — WebKit cancels the synthesized click if
// the finger drifts even a few pixels, so a tap "flashes" (the :active style paints) without
// doing anything. Deciding at pointerup instead, with our own movement tolerance, makes the
// first tap count.

/** How far the finger may drift between pointerdown and pointerup and still count as a tap. */
export const PRESS_SLOP_PX = 12;

/**
 * How long after a pointer-driven press we ignore the browser's follow-up `click`. Only needs
 * to outlast the pointerup -> click gap; keyboard/AT activation arrives with no preceding
 * pointerdown and so is never inside this window.
 */
export const CLICK_FALLBACK_SUPPRESS_MS = 700;

/**
 * How long we wait for the browser's follow-up `click` after firing from pointerup, before
 * giving up on swallowing it. Only needs to cover the pointerup -> click gap (a frame or two);
 * `touch-action: manipulation` means there's no 300ms tap delay to wait out.
 */
export const CLICK_SWALLOW_MS = 400;

export interface PressAttempt {
  /** Horizontal drift from pointerdown to pointerup, in CSS pixels. */
  dx: number;
  /** Vertical drift from pointerdown to pointerup, in CSS pixels. */
  dy: number;
  /** Whether the scroll container scrolled at any point during the gesture. */
  scrolledDuringPress: boolean;
  /** Time since this control last fired a press. `Infinity` if it never has. */
  msSinceLastFire: number;
  /** Minimum gap between two accepted presses on this control. `0` disables the check. */
  cooldownMs: number;
}

/**
 * Decides whether a completed pointer gesture counts as a tap.
 *
 * A scroll during the gesture always wins — that's what stops a flick (or the tap that halts
 * iOS momentum scrolling) from logging a food or a goal.
 */
export function shouldFirePress({
  dx,
  dy,
  scrolledDuringPress,
  msSinceLastFire,
  cooldownMs,
}: PressAttempt): boolean {
  if (scrolledDuringPress) return false;
  if (Math.hypot(dx, dy) > PRESS_SLOP_PX) return false;
  if (cooldownMs > 0 && msSinceLastFire < cooldownMs) return false;
  return true;
}

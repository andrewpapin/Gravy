import { describe, it, expect } from 'vitest';
import { shouldFirePress, PRESS_SLOP_PX, type PressAttempt } from './pressGesture';

const attempt = (over: Partial<PressAttempt> = {}): PressAttempt => ({
  dx: 0,
  dy: 0,
  scrolledDuringPress: false,
  msSinceLastFire: Infinity,
  cooldownMs: 0,
  ...over,
});

describe('shouldFirePress', () => {
  it('fires on a clean, motionless tap', () => {
    expect(shouldFirePress(attempt())).toBe(true);
  });

  it('tolerates drift up to the slop threshold', () => {
    expect(shouldFirePress(attempt({ dx: PRESS_SLOP_PX, dy: 0 }))).toBe(true);
    expect(shouldFirePress(attempt({ dx: 0, dy: PRESS_SLOP_PX }))).toBe(true);
    // Diagonal drift is measured as distance, not per-axis.
    expect(shouldFirePress(attempt({ dx: 8, dy: 8 }))).toBe(true);
  });

  it('rejects drift past the slop threshold', () => {
    expect(shouldFirePress(attempt({ dx: PRESS_SLOP_PX + 0.5, dy: 0 }))).toBe(false);
    expect(shouldFirePress(attempt({ dx: 0, dy: PRESS_SLOP_PX + 0.5 }))).toBe(false);
    expect(shouldFirePress(attempt({ dx: 10, dy: 10 }))).toBe(false);
  });

  it('treats drift as distance regardless of direction', () => {
    expect(shouldFirePress(attempt({ dx: -PRESS_SLOP_PX, dy: 0 }))).toBe(true);
    expect(shouldFirePress(attempt({ dx: 0, dy: -(PRESS_SLOP_PX + 1) }))).toBe(false);
  });

  it('never fires when the container scrolled during the gesture', () => {
    // Even a perfectly still finger: this is the tap that stops iOS momentum scrolling.
    expect(shouldFirePress(attempt({ scrolledDuringPress: true }))).toBe(false);
  });

  it('ignores the cooldown when it is zero (steppers stay rapid-fire)', () => {
    expect(shouldFirePress(attempt({ msSinceLastFire: 0, cooldownMs: 0 }))).toBe(true);
  });

  it('suppresses a repeat press inside the cooldown window', () => {
    expect(shouldFirePress(attempt({ msSinceLastFire: 120, cooldownMs: 350 }))).toBe(false);
  });

  it('allows a repeat press once the cooldown has elapsed', () => {
    expect(shouldFirePress(attempt({ msSinceLastFire: 350, cooldownMs: 350 }))).toBe(true);
    expect(shouldFirePress(attempt({ msSinceLastFire: 900, cooldownMs: 350 }))).toBe(true);
  });

  it('fires the first press even with a cooldown set', () => {
    expect(shouldFirePress(attempt({ msSinceLastFire: Infinity, cooldownMs: 350 }))).toBe(true);
  });
});

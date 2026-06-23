import { describe, expect, it } from 'vitest';
import { cloneDefaultState } from './defaultState';
import { applyAward, applyAwardForDay, applyBonusItem, applyBonusItemForDay, reverseBonusItem } from './points';
import type { DayLog, GravyState } from './types';

function freshState(): GravyState {
  const state = cloneDefaultState();
  state.points = 0;
  state.totalPoints = 0;
  state.todayPoints = 0;
  state.counters.maxDayPoints = 0;
  return state;
}

function freshLog(): DayLog {
  return { foodCounts: {}, goalIds: [], points: 0 };
}

describe('applyAward', () => {
  it('adds points to balance, lifetime total, and today total', () => {
    const state = freshState();
    applyAward(state, 15);
    expect(state.points).toBe(15);
    expect(state.totalPoints).toBe(15);
    expect(state.todayPoints).toBe(15);
  });

  it('does not floor a negative balance (exact-inverse removals must cancel out)', () => {
    const state = freshState();
    applyAward(state, 10);
    applyAward(state, -25);
    expect(state.points).toBe(-15);
    expect(state.totalPoints).toBe(-15);
    expect(state.todayPoints).toBe(-15);
  });

  it('tracks the day high-water mark and never lowers it', () => {
    const state = freshState();
    applyAward(state, 30);
    expect(state.counters.maxDayPoints).toBe(30);
    applyAward(state, -10);
    expect(state.todayPoints).toBe(20);
    expect(state.counters.maxDayPoints).toBe(30);
    applyAward(state, 50);
    expect(state.counters.maxDayPoints).toBe(70);
  });
});

describe('applyAwardForDay', () => {
  it('moves the live balance/lifetime total while crediting the given day log', () => {
    const state = freshState();
    state.points = 5;
    state.totalPoints = 5;
    const log = freshLog();
    applyAwardForDay(state, log, 20);
    expect(state.points).toBe(25);
    expect(state.totalPoints).toBe(25);
    expect(log.points).toBe(20);
    // todayPoints is untouched — this path is for editing a past day, not today.
    expect(state.todayPoints).toBe(0);
  });

  it('tracks maxDayPoints off the log, not todayPoints', () => {
    const state = freshState();
    const log = freshLog();
    applyAwardForDay(state, log, 40);
    expect(state.counters.maxDayPoints).toBe(40);
    applyAwardForDay(state, log, -15);
    expect(log.points).toBe(25);
    expect(state.counters.maxDayPoints).toBe(40);
  });
});

describe('applyBonusItem (forgiveness)', () => {
  it('applies the full reward when pts is positive, regardless of balance', () => {
    const state = freshState();
    state.points = 0;
    const applied = applyBonusItem(state, 25);
    expect(applied).toBe(25);
    expect(state.points).toBe(25);
    expect(state.totalPoints).toBe(25);
    expect(state.todayPoints).toBe(25);
  });

  it('applies the full penalty when the balance covers it', () => {
    const state = freshState();
    state.points = 30;
    state.totalPoints = 30;
    const applied = applyBonusItem(state, -10);
    expect(applied).toBe(-10);
    expect(state.points).toBe(20);
    expect(state.totalPoints).toBe(20);
  });

  it('forgives the penalty down to a zero balance when broke', () => {
    const state = freshState();
    state.points = 5;
    state.totalPoints = 5;
    const applied = applyBonusItem(state, -10);
    expect(applied).toBe(-5);
    expect(state.points).toBe(0);
    expect(state.totalPoints).toBe(0);
  });

  it('applies nothing when already at zero balance', () => {
    const state = freshState();
    state.points = 0;
    const applied = applyBonusItem(state, -10);
    expect(applied).toBe(0);
    expect(state.points).toBe(0);
  });

  it('never forgives based on a negative balance (no double-dip)', () => {
    const state = freshState();
    state.points = -5;
    state.totalPoints = -5;
    const applied = applyBonusItem(state, -10);
    expect(applied).toBe(0);
    expect(state.points).toBe(-5);
  });
});

describe('applyBonusItemForDay (forgiveness)', () => {
  it('mirrors applyBonusItem but credits the day log instead of todayPoints', () => {
    const state = freshState();
    state.points = 8;
    state.totalPoints = 8;
    const log = freshLog();
    const applied = applyBonusItemForDay(state, log, -20);
    expect(applied).toBe(-8);
    expect(state.points).toBe(0);
    expect(log.points).toBe(-8);
    expect(state.todayPoints).toBe(0);
  });
});

describe('reverseBonusItem (exact-undo)', () => {
  it('reverses a non-forgiven penalty exactly', () => {
    // Tap applied -10 in full (not forgiven); net recorded is -10.
    expect(reverseBonusItem(-10, -10)).toBe(10);
  });

  it('reverses a forgiven penalty by only the amount actually applied', () => {
    // Tap only applied -5 (forgiven down from -10); undo must give back exactly 5, not 10.
    expect(reverseBonusItem(-5, -10)).toBe(5);
  });

  it('gives back nothing when a penalty was fully forgiven to zero', () => {
    expect(reverseBonusItem(0, -10)).toBe(0);
  });

  it('reverses a reward exactly', () => {
    expect(reverseBonusItem(25, 25)).toBe(-25);
  });

  it('never reverses more than one tap is worth even if net is inflated', () => {
    // Defensive bound: net somehow exceeds a single tap's nominal value.
    expect(reverseBonusItem(100, 25)).toBe(-25);
    expect(reverseBonusItem(-100, -25)).toBe(25);
  });

  it('round-trips: log then undo leaves the balance unchanged', () => {
    const state = freshState();
    state.points = 5;
    state.totalPoints = 5;
    state.todayPoints = 5;
    let net = 0;
    net += applyBonusItem(state, -10); // forgiven to -5
    expect(state.points).toBe(0);
    const reverse = reverseBonusItem(net, -10);
    state.points += reverse;
    state.totalPoints += reverse;
    state.todayPoints += reverse;
    expect(state.points).toBe(5);
    expect(state.totalPoints).toBe(5);
    expect(state.todayPoints).toBe(5);
  });

  it('round-trips across repeated taps and undos (forgiveness boundary crossed mid-stream)', () => {
    const state = freshState();
    state.points = 8;
    state.totalPoints = 8;
    state.todayPoints = 8;
    let net = 0;
    net += applyBonusItem(state, -5); // full -5, balance 3
    net += applyBonusItem(state, -5); // forgiven to -3, balance 0
    expect(state.points).toBe(0);
    expect(net).toBe(-8);

    // A single undo call never gives back more than one nominal tap's worth (5)...
    let reverse = reverseBonusItem(net, -5);
    expect(reverse).toBe(5);
    state.points += reverse;
    state.totalPoints += reverse;
    state.todayPoints += reverse;
    net += reverse;
    expect(state.points).toBe(5);
    expect(net).toBe(-3);

    // ...and the second undo is capped by what's actually left in net (3), not the
    // nominal -5 — so across both calls the total given back exactly matches what
    // was taken (8), never more.
    reverse = reverseBonusItem(net, -5);
    expect(reverse).toBe(3);
    state.points += reverse;
    state.totalPoints += reverse;
    state.todayPoints += reverse;
    net += reverse;
    expect(state.points).toBe(8);
    expect(net).toBe(0);
  });
});

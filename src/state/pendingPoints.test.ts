import { describe, expect, it } from 'vitest';
import { cloneDefaultState } from './defaultState';
import { queuePendingPoints, takeMostRecentPending } from './pendingPoints';
import type { GravyState } from './types';

function freshState(): GravyState {
  const state = cloneDefaultState();
  state.pendingPointsAwards = [];
  return state;
}

describe('queuePendingPoints', () => {
  it('appends a pending award carrying kind/itemId/pts/label', () => {
    const state = freshState();
    queuePendingPoints(state, 'goal', 1, 15, 'Read for 30 minutes done!');
    expect(state.pendingPointsAwards).toHaveLength(1);
    expect(state.pendingPointsAwards[0]).toMatchObject({ kind: 'goal', itemId: 1, pts: 15, label: 'Read for 30 minutes done!' });
  });

  it('allows multiple queued awards for the same kind/itemId (repeatable Bonus items)', () => {
    const state = freshState();
    queuePendingPoints(state, 'bonus', 9, 15, 'Extra reading time');
    queuePendingPoints(state, 'bonus', 9, 15, 'Extra reading time');
    expect(state.pendingPointsAwards).toHaveLength(2);
  });
});

describe('takeMostRecentPending', () => {
  it('returns null when nothing is pending for that kind/itemId', () => {
    const state = freshState();
    expect(takeMostRecentPending(state, 'goal', 1)).toBeNull();
    expect(state.pendingPointsAwards).toHaveLength(0);
  });

  it('removes and returns the single matching entry', () => {
    const state = freshState();
    queuePendingPoints(state, 'food', 'apple', 10, 'Apple logged!');
    const taken = takeMostRecentPending(state, 'food', 'apple');
    expect(taken).toMatchObject({ kind: 'food', itemId: 'apple', pts: 10 });
    expect(state.pendingPointsAwards).toHaveLength(0);
  });

  it('is LIFO across repeated awards for the same kind/itemId', () => {
    const state = freshState();
    queuePendingPoints(state, 'bonus', 9, 15, 'first tap');
    queuePendingPoints(state, 'bonus', 9, 15, 'second tap');
    const first = takeMostRecentPending(state, 'bonus', 9);
    expect(first?.label).toBe('second tap');
    expect(state.pendingPointsAwards).toHaveLength(1);
    const second = takeMostRecentPending(state, 'bonus', 9);
    expect(second?.label).toBe('first tap');
    expect(state.pendingPointsAwards).toHaveLength(0);
  });

  it('only removes the matching kind, leaving other kinds/items untouched', () => {
    const state = freshState();
    queuePendingPoints(state, 'goal', 1, 15, 'goal one');
    queuePendingPoints(state, 'food', 1, 10, 'food one (same itemId, different kind)');
    const taken = takeMostRecentPending(state, 'goal', 1);
    expect(taken?.label).toBe('goal one');
    expect(state.pendingPointsAwards).toHaveLength(1);
    expect(state.pendingPointsAwards[0].kind).toBe('food');
  });

  it('does not affect a different itemId of the same kind', () => {
    const state = freshState();
    queuePendingPoints(state, 'goal', 1, 15, 'goal one');
    queuePendingPoints(state, 'goal', 2, 20, 'goal two');
    expect(takeMostRecentPending(state, 'goal', 1)?.label).toBe('goal one');
    expect(state.pendingPointsAwards).toHaveLength(1);
    expect(state.pendingPointsAwards[0].itemId).toBe(2);
  });
});

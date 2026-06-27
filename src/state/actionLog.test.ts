import { describe, expect, it } from 'vitest';
import { ACTION_LOG_MAX_ENTRIES, appendActionLog, isMostRecentNonUndone, markMostRecentUndone } from './actionLog';
import { cloneDefaultState } from './defaultState';
import type { ActionLogEntry, GravyState } from './types';

function freshState(): GravyState {
  const state = cloneDefaultState();
  state.actionLog = [];
  return state;
}

function entry(overrides: Partial<ActionLogEntry> = {}): Omit<ActionLogEntry, 'id' | 'at'> {
  return { type: 'food', label: 'Apple logged!', pts: 5, dateStr: '2026-06-27', itemId: 'apple', ...overrides };
}

describe('appendActionLog', () => {
  it('pushes a new entry with a generated id and timestamp', () => {
    const state = freshState();
    appendActionLog(state, undefined, entry());
    expect(state.actionLog).toHaveLength(1);
    expect(state.actionLog[0].label).toBe('Apple logged!');
    expect(state.actionLog[0].id).toBeTruthy();
    expect(state.actionLog[0].at).toBeTypeOf('number');
  });

  it('evicts the oldest entries once the cap is exceeded (FIFO)', () => {
    const state = freshState();
    for (let i = 0; i < ACTION_LOG_MAX_ENTRIES + 10; i++) {
      appendActionLog(state, undefined, entry({ label: `entry-${i}` }));
    }
    expect(state.actionLog).toHaveLength(ACTION_LOG_MAX_ENTRIES);
    expect(state.actionLog[0].label).toBe('entry-10');
    expect(state.actionLog[state.actionLog.length - 1].label).toBe(`entry-${ACTION_LOG_MAX_ENTRIES + 9}`);
  });
});

describe('appendActionLog actor attribution', () => {
  it('stamps the actor onto the entry when one is signed in', () => {
    const state = freshState();
    appendActionLog(state, { userId: 'u-1', label: 'mom@example.com' }, entry());
    expect(state.actionLog[0].actorUserId).toBe('u-1');
    expect(state.actionLog[0].actorLabel).toBe('mom@example.com');
  });

  it('leaves actor fields absent for an anonymous (no-account) action', () => {
    const state = freshState();
    appendActionLog(state, undefined, entry());
    expect(state.actionLog[0].actorUserId).toBeUndefined();
    expect(state.actionLog[0].actorLabel).toBeUndefined();
  });

  it('omits a missing label even when a userId is present', () => {
    const state = freshState();
    appendActionLog(state, { userId: 'u-2' }, entry());
    expect(state.actionLog[0].actorUserId).toBe('u-2');
    expect(state.actionLog[0].actorLabel).toBeUndefined();
  });
});

describe('markMostRecentUndone', () => {
  it('flips undone on the latest matching, non-undone entry', () => {
    const state = freshState();
    appendActionLog(state, undefined, entry());
    appendActionLog(state, undefined, entry());
    markMostRecentUndone(state.actionLog, 'food', 'apple', '2026-06-27');
    expect(state.actionLog[0].undone).toBeUndefined();
    expect(state.actionLog[1].undone).toBe(true);
  });

  it('ignores entries that do not match type/itemId/dateStr', () => {
    const state = freshState();
    appendActionLog(state, undefined, entry());
    markMostRecentUndone(state.actionLog, 'food', 'banana', '2026-06-27');
    markMostRecentUndone(state.actionLog, 'goal', 'apple', '2026-06-27');
    markMostRecentUndone(state.actionLog, 'food', 'apple', '2026-06-26');
    expect(state.actionLog[0].undone).toBeUndefined();
  });

  it('skips an already-undone entry and falls through to the next-latest match', () => {
    const state = freshState();
    appendActionLog(state, undefined, entry());
    appendActionLog(state, undefined, entry());
    markMostRecentUndone(state.actionLog, 'food', 'apple', '2026-06-27');
    markMostRecentUndone(state.actionLog, 'food', 'apple', '2026-06-27');
    expect(state.actionLog[0].undone).toBe(true);
    expect(state.actionLog[1].undone).toBe(true);
  });

  it('is a no-op when every matching entry is already undone', () => {
    const state = freshState();
    appendActionLog(state, undefined, entry());
    markMostRecentUndone(state.actionLog, 'food', 'apple', '2026-06-27');
    expect(() => markMostRecentUndone(state.actionLog, 'food', 'apple', '2026-06-27')).not.toThrow();
    expect(state.actionLog[0].undone).toBe(true);
  });
});

describe('isMostRecentNonUndone', () => {
  it('is true for the latest non-undone entry sharing type/itemId/dateStr', () => {
    const state = freshState();
    appendActionLog(state, undefined, entry());
    appendActionLog(state, undefined, entry());
    expect(isMostRecentNonUndone(state.actionLog, state.actionLog[1])).toBe(true);
    expect(isMostRecentNonUndone(state.actionLog, state.actionLog[0])).toBe(false);
  });

  it('is false for an entry already marked undone', () => {
    const state = freshState();
    appendActionLog(state, undefined, entry());
    state.actionLog[0].undone = true;
    expect(isMostRecentNonUndone(state.actionLog, state.actionLog[0])).toBe(false);
  });

  it('treats entries with different type/itemId/dateStr as independent keys', () => {
    const state = freshState();
    appendActionLog(state, undefined, entry({ itemId: 'apple' }));
    appendActionLog(state, undefined, entry({ itemId: 'banana' }));
    expect(isMostRecentNonUndone(state.actionLog, state.actionLog[0])).toBe(true);
    expect(isMostRecentNonUndone(state.actionLog, state.actionLog[1])).toBe(true);
  });

  it('becomes true for an older entry once the newer one is undone', () => {
    const state = freshState();
    appendActionLog(state, undefined, entry());
    appendActionLog(state, undefined, entry());
    markMostRecentUndone(state.actionLog, 'food', 'apple', '2026-06-27');
    expect(isMostRecentNonUndone(state.actionLog, state.actionLog[0])).toBe(true);
  });
});

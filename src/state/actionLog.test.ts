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
    appendActionLog(state, entry());
    expect(state.actionLog).toHaveLength(1);
    expect(state.actionLog[0].label).toBe('Apple logged!');
    expect(state.actionLog[0].id).toBeTruthy();
    expect(state.actionLog[0].at).toBeTypeOf('number');
  });

  it('evicts the oldest entries once the cap is exceeded (FIFO)', () => {
    const state = freshState();
    for (let i = 0; i < ACTION_LOG_MAX_ENTRIES + 10; i++) {
      appendActionLog(state, entry({ label: `entry-${i}` }));
    }
    expect(state.actionLog).toHaveLength(ACTION_LOG_MAX_ENTRIES);
    expect(state.actionLog[0].label).toBe('entry-10');
    expect(state.actionLog[state.actionLog.length - 1].label).toBe(`entry-${ACTION_LOG_MAX_ENTRIES + 9}`);
  });
});

describe('markMostRecentUndone', () => {
  it('flips undone on the latest matching, non-undone entry', () => {
    const state = freshState();
    appendActionLog(state, entry());
    appendActionLog(state, entry());
    markMostRecentUndone(state.actionLog, 'food', 'apple', '2026-06-27');
    expect(state.actionLog[0].undone).toBeUndefined();
    expect(state.actionLog[1].undone).toBe(true);
  });

  it('ignores entries that do not match type/itemId/dateStr', () => {
    const state = freshState();
    appendActionLog(state, entry());
    markMostRecentUndone(state.actionLog, 'food', 'banana', '2026-06-27');
    markMostRecentUndone(state.actionLog, 'goal', 'apple', '2026-06-27');
    markMostRecentUndone(state.actionLog, 'food', 'apple', '2026-06-26');
    expect(state.actionLog[0].undone).toBeUndefined();
  });

  it('skips an already-undone entry and falls through to the next-latest match', () => {
    const state = freshState();
    appendActionLog(state, entry());
    appendActionLog(state, entry());
    markMostRecentUndone(state.actionLog, 'food', 'apple', '2026-06-27');
    markMostRecentUndone(state.actionLog, 'food', 'apple', '2026-06-27');
    expect(state.actionLog[0].undone).toBe(true);
    expect(state.actionLog[1].undone).toBe(true);
  });

  it('is a no-op when every matching entry is already undone', () => {
    const state = freshState();
    appendActionLog(state, entry());
    markMostRecentUndone(state.actionLog, 'food', 'apple', '2026-06-27');
    expect(() => markMostRecentUndone(state.actionLog, 'food', 'apple', '2026-06-27')).not.toThrow();
    expect(state.actionLog[0].undone).toBe(true);
  });
});

describe('isMostRecentNonUndone', () => {
  it('is true for the latest non-undone entry sharing type/itemId/dateStr', () => {
    const state = freshState();
    appendActionLog(state, entry());
    appendActionLog(state, entry());
    expect(isMostRecentNonUndone(state.actionLog, state.actionLog[1])).toBe(true);
    expect(isMostRecentNonUndone(state.actionLog, state.actionLog[0])).toBe(false);
  });

  it('is false for an entry already marked undone', () => {
    const state = freshState();
    appendActionLog(state, entry());
    state.actionLog[0].undone = true;
    expect(isMostRecentNonUndone(state.actionLog, state.actionLog[0])).toBe(false);
  });

  it('treats entries with different type/itemId/dateStr as independent keys', () => {
    const state = freshState();
    appendActionLog(state, entry({ itemId: 'apple' }));
    appendActionLog(state, entry({ itemId: 'banana' }));
    expect(isMostRecentNonUndone(state.actionLog, state.actionLog[0])).toBe(true);
    expect(isMostRecentNonUndone(state.actionLog, state.actionLog[1])).toBe(true);
  });

  it('becomes true for an older entry once the newer one is undone', () => {
    const state = freshState();
    appendActionLog(state, entry());
    appendActionLog(state, entry());
    markMostRecentUndone(state.actionLog, 'food', 'apple', '2026-06-27');
    expect(isMostRecentNonUndone(state.actionLog, state.actionLog[0])).toBe(true);
  });
});

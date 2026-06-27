import { describe, expect, it } from 'vitest';
import { AUDIT_LOG_MAX_ENTRIES, appendAuditLog } from './auditLog';
import { cloneDefaultState } from './defaultState';
import type { GravyState } from './types';

function freshState(): GravyState {
  const state = cloneDefaultState();
  state.auditLog = [];
  return state;
}

describe('appendAuditLog', () => {
  it('pushes an entry with a generated id and timestamp', () => {
    const state = freshState();
    appendAuditLog(state, undefined, { type: 'goalAdded', label: 'Added goal "Brush teeth"' });
    expect(state.auditLog).toHaveLength(1);
    expect(state.auditLog[0].type).toBe('goalAdded');
    expect(state.auditLog[0].label).toBe('Added goal "Brush teeth"');
    expect(state.auditLog[0].id).toBeTruthy();
    expect(state.auditLog[0].at).toBeTypeOf('number');
  });

  it('stamps the actor when one is signed in, omits it otherwise', () => {
    const state = freshState();
    appendAuditLog(state, { userId: 'u-1', label: 'dad@example.com' }, { type: 'resetAll', label: 'Reset everything' });
    appendAuditLog(state, undefined, { type: 'resetToday', label: "Reset today's progress" });
    expect(state.auditLog[0].actorUserId).toBe('u-1');
    expect(state.auditLog[0].actorLabel).toBe('dad@example.com');
    expect(state.auditLog[1].actorUserId).toBeUndefined();
    expect(state.auditLog[1].actorLabel).toBeUndefined();
  });

  it('evicts oldest entries once the cap is exceeded (FIFO)', () => {
    const state = freshState();
    for (let i = 0; i < AUDIT_LOG_MAX_ENTRIES + 5; i++) {
      appendAuditLog(state, undefined, { type: 'settingChanged', label: `change-${i}` });
    }
    expect(state.auditLog).toHaveLength(AUDIT_LOG_MAX_ENTRIES);
    expect(state.auditLog[0].label).toBe('change-5');
    expect(state.auditLog[state.auditLog.length - 1].label).toBe(`change-${AUDIT_LOG_MAX_ENTRIES + 4}`);
  });
});

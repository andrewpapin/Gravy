import { describe, expect, it } from 'vitest';
import { cloneDefaultState } from './defaultState';
import { mergeRoots, mergeStates } from './merge';
import type { ActionLogEntry, GravyRoot, GravyState, Goal, Reward } from './types';

function freshState(): GravyState {
  const state = cloneDefaultState();
  state.goals = [];
  state.rewards = [];
  state.badgeConfig = {};
  state.dayLogs = {};
  state.earnedBadges = [];
  state.actionLog = [];
  state.auditLog = [];
  state.pendingRewards = [];
  return state;
}

function goal(id: number, name: string, pts = 5): Goal {
  return { id, emoji: '⭐', name, pts };
}

function reward(id: number, name: string, cost = 10): Reward {
  return { id, emoji: '🎁', name, cost };
}

function action(id: string, at: number, undone = false): ActionLogEntry {
  return { id, type: 'goal', label: id, pts: 1, dateStr: '2026-06-28', at, undone };
}

function profileRoot(id: string, state: GravyState): GravyRoot {
  return { version: 2, activeProfileId: id, profiles: [{ id, state }] };
}

describe('mergeStates — id-keyed collections', () => {
  it('unions goals, keeping additions from both sides', () => {
    const local = freshState();
    local.goals = [goal(1, 'Brush teeth'), goal(2, 'Make bed')];
    const remote = freshState();
    remote.goals = [goal(1, 'Brush teeth'), goal(3, 'Homework')];

    const merged = mergeStates(local, remote);
    expect(merged.goals.map((g) => g.id).sort()).toEqual([1, 2, 3]);
  });

  it('prefers the remote record on a shared goal id (edit conflict → last-write-wins)', () => {
    const local = freshState();
    local.goals = [goal(1, 'Local name', 5)];
    const remote = freshState();
    remote.goals = [goal(1, 'Remote name', 9)];

    const merged = mergeStates(local, remote);
    expect(merged.goals).toHaveLength(1);
    expect(merged.goals[0]).toMatchObject({ id: 1, name: 'Remote name', pts: 9 });
  });

  it('puts remote items first, then local-only items, preserving snapshot order', () => {
    const local = freshState();
    local.goals = [goal(2, 'Local only')];
    const remote = freshState();
    remote.goals = [goal(1, 'Remote A'), goal(3, 'Remote B')];

    const merged = mergeStates(local, remote);
    expect(merged.goals.map((g) => g.id)).toEqual([1, 3, 2]);
  });

  it('unions rewards by id', () => {
    const local = freshState();
    local.rewards = [reward(1, 'Ice cream')];
    const remote = freshState();
    remote.rewards = [reward(2, 'Movie night')];

    const merged = mergeStates(local, remote);
    expect(merged.rewards.map((r) => r.id).sort()).toEqual([1, 2]);
  });

  it('unions badgeConfig keys, remote winning a shared key', () => {
    const local = freshState();
    local.badgeConfig = { a: { enabled: false }, b: { name: 'Local' } };
    const remote = freshState();
    remote.badgeConfig = { b: { name: 'Remote' }, c: { enabled: true } };

    const merged = mergeStates(local, remote);
    expect(Object.keys(merged.badgeConfig).sort()).toEqual(['a', 'b', 'c']);
    expect(merged.badgeConfig.b).toEqual({ name: 'Remote' });
  });
});

describe('mergeStates — sets and per-day logs', () => {
  it('unions earnedBadges without duplicates', () => {
    const local = freshState();
    local.earnedBadges = ['first-goal', 'streak-3'];
    const remote = freshState();
    remote.earnedBadges = ['streak-3', 'food-hero'];

    const merged = mergeStates(local, remote);
    expect(merged.earnedBadges.sort()).toEqual(['first-goal', 'food-hero', 'streak-3']);
  });

  it('unions dayLogs by date key', () => {
    const local = freshState();
    local.dayLogs = { '2026-06-27': { foodCounts: {}, goalIds: [1], points: 5 } };
    const remote = freshState();
    remote.dayLogs = { '2026-06-28': { foodCounts: {}, goalIds: [2], points: 8 } };

    const merged = mergeStates(local, remote);
    expect(Object.keys(merged.dayLogs).sort()).toEqual(['2026-06-27', '2026-06-28']);
  });
});

describe('mergeStates — append-only logs', () => {
  it('unions actionLog by id and sorts chronologically', () => {
    const local = freshState();
    local.actionLog = [action('a', 100), action('b', 300)];
    const remote = freshState();
    remote.actionLog = [action('c', 200)];

    const merged = mergeStates(local, remote);
    expect(merged.actionLog.map((e) => e.id)).toEqual(['a', 'c', 'b']);
  });

  it('keeps a shared action entry undone if either side undid it (undone is monotonic)', () => {
    const local = freshState();
    local.actionLog = [action('x', 100, true)];
    const remote = freshState();
    remote.actionLog = [action('x', 100, false)];

    const merged = mergeStates(local, remote);
    expect(merged.actionLog).toHaveLength(1);
    expect(merged.actionLog[0].undone).toBe(true);
  });

  it('unions auditLog by id', () => {
    const local = freshState();
    local.auditLog = [{ id: 'g1', type: 'goalAdded', label: 'Added', at: 50 }];
    const remote = freshState();
    remote.auditLog = [{ id: 'g2', type: 'goalRemoved', label: 'Removed', at: 70 }];

    const merged = mergeStates(local, remote);
    expect(merged.auditLog.map((e) => e.id)).toEqual(['g1', 'g2']);
  });
});

describe('mergeStates — live progress scalars keep last-write-wins', () => {
  it('takes the remote snapshot for points/streaks/today fields', () => {
    const local = freshState();
    local.points = 10;
    local.streak = 2;
    local.todayPoints = 4;
    const remote = freshState();
    remote.points = 25;
    remote.streak = 5;
    remote.todayPoints = 12;

    const merged = mergeStates(local, remote);
    expect(merged.points).toBe(25);
    expect(merged.streak).toBe(5);
    expect(merged.todayPoints).toBe(12);
  });
});

describe('mergeStates — idempotence', () => {
  it('re-applying the same remote is a no-op', () => {
    const local = freshState();
    local.goals = [goal(1, 'A'), goal(2, 'B')];
    const remote = freshState();
    remote.goals = [goal(2, 'B'), goal(3, 'C')];

    const once = mergeStates(local, remote);
    const twice = mergeStates(once, remote);
    expect(twice.goals).toEqual(once.goals);
    expect(twice).toEqual(once);
  });
});

describe('mergeRoots — profiles', () => {
  it('state-merges a profile present on both sides', () => {
    const localState = freshState();
    localState.goals = [goal(1, 'Local')];
    const remoteState = freshState();
    remoteState.goals = [goal(2, 'Remote')];

    const merged = mergeRoots(profileRoot('kid-1', localState), profileRoot('kid-1', remoteState));
    expect(merged.profiles).toHaveLength(1);
    expect(merged.profiles[0].state.goals.map((g) => g.id).sort()).toEqual([1, 2]);
  });

  it('keeps a profile that exists only remotely (kid added on another device)', () => {
    const local = profileRoot('kid-1', freshState());
    const remote: GravyRoot = {
      version: 2,
      activeProfileId: 'kid-2',
      profiles: [
        { id: 'kid-1', state: freshState() },
        { id: 'kid-2', state: freshState() },
      ],
    };

    const merged = mergeRoots(local, remote);
    expect(merged.profiles.map((p) => p.id).sort()).toEqual(['kid-1', 'kid-2']);
  });

  it('keeps a profile that exists only locally (kid added but not yet pushed)', () => {
    const local: GravyRoot = {
      version: 2,
      activeProfileId: 'kid-1',
      profiles: [
        { id: 'kid-1', state: freshState() },
        { id: 'kid-2', state: freshState() },
      ],
    };
    const remote = profileRoot('kid-1', freshState());

    const merged = mergeRoots(local, remote);
    expect(merged.profiles.map((p) => p.id).sort()).toEqual(['kid-1', 'kid-2']);
  });

  it('follows the remote active profile when it survives the merge', () => {
    const local = profileRoot('kid-1', freshState());
    const remote = profileRoot('kid-2', freshState());
    const merged = mergeRoots(local, remote);
    expect(merged.activeProfileId).toBe('kid-2');
  });

  it('falls back to a local active profile id when remote points at a dropped profile', () => {
    const local = profileRoot('kid-1', freshState());
    const remote: GravyRoot = { version: 2, activeProfileId: 'ghost', profiles: [{ id: 'kid-1', state: freshState() }] };
    const merged = mergeRoots(local, remote);
    expect(merged.activeProfileId).toBe('kid-1');
  });
});

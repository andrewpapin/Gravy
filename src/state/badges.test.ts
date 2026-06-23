import { describe, expect, it } from 'vitest';
import { cloneDefaultState } from './defaultState';
import {
  findNewlyEarnedBadges,
  getBadgeDisplay,
  getBadgeProgress,
  getEnabledBadgeCount,
  getEnabledBadges,
} from './badges';
import type { GravyState } from './types';

function freshState(overrides: Partial<GravyState> = {}): GravyState {
  const state = cloneDefaultState();
  return { ...state, ...overrides, counters: { ...state.counters, ...overrides.counters } };
}

describe('findNewlyEarnedBadges', () => {
  it('fires first-time badges on first occurrence', () => {
    const state = freshState({
      counters: { ...cloneDefaultState().counters, foodLogs: { fruit: 1 }, totalGoals: 1, totalRewards: 1 },
    });
    const earned = findNewlyEarnedBadges(state);
    expect(earned).toContain('first_food');
    expect(earned).toContain('first_chore');
    expect(earned).toContain('first_reward');
  });

  it('does not fire a badge that is already in earnedBadges', () => {
    const state = freshState({
      earnedBadges: ['first_food'],
      counters: { ...cloneDefaultState().counters, foodLogs: { fruit: 1 } },
    });
    expect(findNewlyEarnedBadges(state)).not.toContain('first_food');
  });

  it('fires a per-food threshold badge only once the count meets the threshold', () => {
    const below = freshState({ counters: { ...cloneDefaultState().counters, foodLogs: { fruit: 4 } } });
    expect(findNewlyEarnedBadges(below)).not.toContain('fruit5');

    const atThreshold = freshState({ counters: { ...cloneDefaultState().counters, foodLogs: { fruit: 5 } } });
    expect(findNewlyEarnedBadges(atThreshold)).toContain('fruit5');
  });

  it('fires pts and streak threshold badges off totalPoints / streak', () => {
    const state = freshState({ totalPoints: 100, streak: 7 });
    const earned = findNewlyEarnedBadges(state);
    expect(earned).toContain('pts100');
    expect(earned).toContain('chore_streak7');
    expect(earned).toContain('streak7');
    expect(earned).not.toContain('pts250');
  });

  it('fires combo and games_won threshold badges off their counters', () => {
    const state = freshState({
      counters: { ...cloneDefaultState().counters, comboDays: 1, gamesWon: 1 },
    });
    const earned = findNewlyEarnedBadges(state);
    expect(earned).toContain('combo1');
    expect(earned).toContain('first_game');
    expect(earned).not.toContain('games_won10');
  });

  it('returns an empty list for a brand-new state', () => {
    expect(findNewlyEarnedBadges(freshState())).toEqual([]);
  });
});

describe('getBadgeProgress', () => {
  it('returns current/target for a per-food threshold badge', () => {
    const state = freshState({ counters: { ...cloneDefaultState().counters, foodLogs: { veggie: 3 } } });
    const badge = { id: 'veggie5', emoji: '', icon: 'carrot' as const, name: '', desc: '', trigger: 'veggie:5' as const, group: 'Food' };
    expect(getBadgeProgress(state, badge)).toEqual({ current: 3, target: 5 });
  });

  it('sums all food groups for a food_count badge', () => {
    const state = freshState({
      counters: { ...cloneDefaultState().counters, foodLogs: { fruit: 2, veggie: 3 } },
    });
    const badge = { id: 'food_count25', emoji: '', icon: 'bowlRice' as const, name: '', desc: '', trigger: 'food_count:25' as const, group: 'Food' };
    expect(getBadgeProgress(state, badge)).toEqual({ current: 5, target: 25 });
  });

  it('floors pts progress at zero for a negative balance', () => {
    const state = freshState({ totalPoints: -20 });
    const badge = { id: 'pts50', emoji: '', icon: 'seedling' as const, name: '', desc: '', trigger: 'pts:50' as const, group: 'Points' };
    expect(getBadgeProgress(state, badge)).toEqual({ current: 0, target: 50 });
  });

  it('returns null for a non-progress-trackable (first-time) badge', () => {
    const state = freshState();
    const badge = { id: 'first_food', emoji: '', icon: 'bowlFood' as const, name: '', desc: '', trigger: 'first_food' as const, group: 'Food' };
    expect(getBadgeProgress(state, badge)).toBeNull();
  });
});

describe('getBadgeDisplay', () => {
  it('returns the master definition when there is no override', () => {
    const state = freshState();
    const display = getBadgeDisplay(state, 'fruit5');
    expect(display).toMatchObject({ id: 'fruit5', name: 'Apple a Day', enabled: true });
  });

  it('applies a badgeConfig override onto the master definition', () => {
    const state = freshState({
      badgeConfig: { fruit5: { name: 'Custom Name', enabled: false } },
    });
    const display = getBadgeDisplay(state, 'fruit5');
    expect(display).toMatchObject({ name: 'Custom Name', enabled: false, emoji: '🍎' });
  });

  it('returns null for an unknown badge id', () => {
    expect(getBadgeDisplay(freshState(), 'not_a_real_badge')).toBeNull();
  });
});

describe('getEnabledBadges / getEnabledBadgeCount', () => {
  it('includes every badge by default', () => {
    const state = freshState();
    const total = getEnabledBadges(state).length;
    expect(total).toBeGreaterThan(0);
    expect(getEnabledBadgeCount(state)).toBe(total);
  });

  it('excludes a badge explicitly disabled via badgeConfig', () => {
    const state = freshState({ badgeConfig: { fruit5: { enabled: false } } });
    const enabled = getEnabledBadges(state);
    expect(enabled.some((b) => b.id === 'fruit5')).toBe(false);
    expect(getEnabledBadgeCount(state)).toBe(enabled.length);
  });
});

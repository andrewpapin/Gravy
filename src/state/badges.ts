import { BADGE_MASTER, type BadgeDef } from '../data/badges';
import type { IconKey } from '../data/icons';
import type { GravyState } from './types';

export interface BadgeDisplay extends BadgeDef {
  enabled: boolean;
}

export function getBadgeDisplay(state: GravyState, id: string): BadgeDisplay | null {
  const master = BADGE_MASTER.find((b) => b.id === id);
  if (!master) return null;
  const cfg = state.badgeConfig[id] || {};
  return {
    ...master,
    emoji: cfg.emoji ?? master.emoji,
    icon: (cfg.icon as IconKey | undefined) ?? master.icon,
    name: cfg.name ?? master.name,
    enabled: cfg.enabled !== undefined ? cfg.enabled : true,
  };
}

export function getEnabledBadges(state: GravyState): BadgeDef[] {
  return BADGE_MASTER.filter((b) => {
    const cfg = state.badgeConfig[b.id];
    return cfg ? cfg.enabled !== false : true;
  });
}

export interface BadgeProgress {
  current: number;
  target: number;
}

// Returns current/target progress towards a badge, or null if it's not a
// progress-trackable badge (e.g. "first time" badges).
export function getBadgeProgress(state: GravyState, badge: BadgeDef): BadgeProgress | null {
  const c = state.counters;
  const [type, threshStr] = badge.trigger.split(':');
  const thresh = parseInt(threshStr) || 0;
  switch (type) {
    case 'fruit':
    case 'veggie':
    case 'protein':
    case 'dairy':
    case 'grain':
      return { current: c.foodLogs[type] || 0, target: thresh };
    case 'food_count': {
      const total = Object.values(c.foodLogs).reduce((s, v) => s + v, 0);
      return { current: total, target: thresh };
    }
    case 'full_tray':
      return { current: c.fullTrayDays, target: thresh };
    case 'chore_count':
      return { current: c.totalGoals, target: thresh };
    case 'all_chores':
      return { current: c.allGoalsDays, target: thresh };
    case 'pts':
      return { current: Math.max(0, state.totalPoints), target: thresh };
    case 'pts_day':
      return { current: c.maxDayPoints, target: thresh };
    case 'streak':
      return { current: state.streak, target: thresh };
    case 'reward_count':
      return { current: c.totalRewards, target: thresh };
    case 'combo':
      return { current: c.comboDays, target: thresh };
    case 'games_won':
      return { current: c.gamesWon, target: thresh };
    default:
      return null;
  }
}

export function getEnabledBadgeCount(state: GravyState): number {
  return BADGE_MASTER.filter((b) => {
    const cfg = state.badgeConfig[b.id];
    return cfg ? cfg.enabled !== false : true;
  }).length;
}

// Whether a badge's trigger condition currently holds against the given state/counters,
// independent of whether it's already in earnedBadges. Shared by findNewlyEarnedBadges
// (has it become true) and findBadgesToRevoke (is it still true).
function isBadgeConditionMet(state: GravyState, badge: BadgeDef): boolean {
  const c = state.counters;
  const [type, threshStr] = badge.trigger.split(':');
  const thresh = parseInt(threshStr) || 0;
  switch (type) {
    case 'first_food':
      return Object.values(c.foodLogs).some((v) => v > 0);
    case 'first_chore':
      return c.totalGoals >= 1;
    case 'first_reward':
      return c.totalRewards >= 1;
    case 'fruit':
      return (c.foodLogs.fruit || 0) >= thresh;
    case 'veggie':
      return (c.foodLogs.veggie || 0) >= thresh;
    case 'protein':
      return (c.foodLogs.protein || 0) >= thresh;
    case 'dairy':
      return (c.foodLogs.dairy || 0) >= thresh;
    case 'grain':
      return (c.foodLogs.grain || 0) >= thresh;
    case 'food_count': {
      const total = Object.values(c.foodLogs).reduce((s, v) => s + v, 0);
      return total >= thresh;
    }
    case 'full_tray':
      return c.fullTrayDays >= thresh;
    case 'chore_count':
      return c.totalGoals >= thresh;
    case 'all_chores':
      return c.allGoalsDays >= thresh;
    case 'pts':
      return state.totalPoints >= thresh;
    case 'pts_day':
      return c.maxDayPoints >= thresh;
    case 'streak':
      return state.streak >= thresh;
    case 'reward_count':
      return c.totalRewards >= thresh;
    case 'combo':
      return c.comboDays >= thresh;
    case 'first_game':
      return c.gamesWon >= 1;
    case 'games_won':
      return c.gamesWon >= thresh;
    default:
      return false;
  }
}

// Returns the ids of badges that newly become earned given the current state/counters.
export function findNewlyEarnedBadges(state: GravyState): string[] {
  return BADGE_MASTER.filter((b) => !state.earnedBadges.includes(b.id) && isBadgeConditionMet(state, b)).map(
    (b) => b.id,
  );
}

// Returns the ids of currently-earned badges whose trigger condition no longer holds — e.g. an
// undo dropped a counter (or totalPoints/streak) back below the badge's threshold. Callers
// remove these from earnedBadges so undoing the action that earned a badge also revokes it,
// letting it be re-earned honestly later.
export function findBadgesToRevoke(state: GravyState): string[] {
  return BADGE_MASTER.filter(
    (b) => state.earnedBadges.includes(b.id) && !isBadgeConditionMet(state, b),
  ).map((b) => b.id);
}

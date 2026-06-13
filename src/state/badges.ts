import { BADGE_MASTER, type BadgeDef } from '../data/badges';
import type { GrubClubState } from './types';

export interface BadgeDisplay extends BadgeDef {
  enabled: boolean;
}

export function getBadgeDisplay(state: GrubClubState, id: string): BadgeDisplay | null {
  const master = BADGE_MASTER.find((b) => b.id === id);
  if (!master) return null;
  const cfg = state.badgeConfig[id] || {};
  return {
    ...master,
    emoji: cfg.emoji ?? master.emoji,
    name: cfg.name ?? master.name,
    enabled: cfg.enabled !== undefined ? cfg.enabled : true,
  };
}

export function getEnabledBadges(state: GrubClubState): BadgeDef[] {
  return BADGE_MASTER.filter((b) => {
    const cfg = state.badgeConfig[b.id];
    return cfg ? cfg.enabled !== false : true;
  });
}

export function getEnabledBadgeCount(state: GrubClubState): number {
  return BADGE_MASTER.filter((b) => {
    const cfg = state.badgeConfig[b.id];
    return cfg ? cfg.enabled !== false : true;
  }).length;
}

// Returns the ids of badges that newly become earned given the current state/counters.
export function findNewlyEarnedBadges(state: GrubClubState): string[] {
  const c = state.counters;
  const newlyEarned: string[] = [];
  BADGE_MASTER.forEach((b) => {
    if (state.earnedBadges.includes(b.id)) return;
    const [type, threshStr] = b.trigger.split(':');
    const thresh = parseInt(threshStr) || 0;
    let earned = false;
    switch (type) {
      case 'first_food':
        earned = Object.values(c.foodLogs).some((v) => v > 0);
        break;
      case 'first_chore':
        earned = c.totalChores >= 1;
        break;
      case 'first_reward':
        earned = c.totalRewards >= 1;
        break;
      case 'fruit':
        earned = (c.foodLogs.fruit || 0) >= thresh;
        break;
      case 'veggie':
        earned = (c.foodLogs.veggie || 0) >= thresh;
        break;
      case 'protein':
        earned = (c.foodLogs.protein || 0) >= thresh;
        break;
      case 'dairy':
        earned = (c.foodLogs.dairy || 0) >= thresh;
        break;
      case 'grain':
        earned = (c.foodLogs.grain || 0) >= thresh;
        break;
      case 'food_count': {
        const total = Object.values(c.foodLogs).reduce((s, v) => s + v, 0);
        earned = total >= thresh;
        break;
      }
      case 'full_tray':
        earned = c.fullTrayDays >= thresh;
        break;
      case 'chore_count':
        earned = c.totalChores >= thresh;
        break;
      case 'all_chores':
        earned = c.allChoresDays >= thresh;
        break;
      case 'pts':
        earned = state.totalPoints >= thresh;
        break;
      case 'pts_day':
        earned = c.maxDayPoints >= thresh;
        break;
      case 'streak':
        earned = state.streak >= thresh;
        break;
      case 'reward_count':
        earned = c.totalRewards >= thresh;
        break;
      case 'combo':
        earned = c.comboDays >= thresh;
        break;
    }
    if (earned) newlyEarned.push(b.id);
  });
  return newlyEarned;
}

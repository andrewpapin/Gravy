export interface Chore {
  id: number;
  emoji: string;
  name: string;
  pts: number;
}

export interface Reward {
  id: number;
  emoji: string;
  name: string;
  cost: number;
}

export interface PendingReward {
  id: string;
  rewardId: number;
}

export interface Counters {
  foodLogs: Record<string, number>;
  fullTrayDays: number;
  totalChores: number;
  allChoresDays: number;
  comboDays: number;
  totalRewards: number;
  maxDayPoints: number;
}

export interface BadgeOverride {
  enabled?: boolean;
  name?: string;
  emoji?: string;
}

export interface Settings {
  foodPts: number;
  bonusPts: number;
  pin: string;
  childName: string;
}

export interface DayLog {
  foodCounts: Record<string, number>;
  choreIds: number[];
  points: number;
}

export interface GrubClubState {
  points: number;
  totalPoints: number;
  streak: number;
  lastActiveDate: string | null;
  todayPoints: number;
  todayFoodCounts: Record<string, number>;
  todayChores: number[];
  dayLogs: Record<string, DayLog>;
  pendingRewards: PendingReward[];
  earnedBadges: string[];
  counters: Counters;
  badgeConfig: Record<string, BadgeOverride>;
  chores: Chore[];
  rewards: Reward[];
  settings: Settings;
}

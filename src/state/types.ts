export interface Goal {
  id: number;
  emoji: string;
  name: string;
  pts: number;
  isDaily?: boolean; // true when undefined (default behavior: daily)
  target?: number;  // how many times to complete (default 1)
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
  totalGoals: number;
  allGoalsDays: number;
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
  goalIds: number[];
  points: number;
}

export interface GrubClubState {
  points: number;
  totalPoints: number;
  streak: number;
  lastActiveDate: string | null;
  todayPoints: number;
  todayFoodCounts: Record<string, number>;
  todayGoals: number[];
  todayGoalCounts: Record<number, number>;
  dayLogs: Record<string, DayLog>;
  pendingRewards: PendingReward[];
  earnedBadges: string[];
  counters: Counters;
  badgeConfig: Record<string, BadgeOverride>;
  goals: Goal[];
  rewards: Reward[];
  settings: Settings;
}

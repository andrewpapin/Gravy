export interface Goal {
  id: number;
  emoji: string;       // legacy fallback; rendered only when `icon` is unset/unknown
  icon?: string;       // registered icon key (see data/icons.ts)
  name: string;
  pts: number;
  // true (or undefined) = Daily Goal: resets each day, shown in "Daily Goals".
  // false = Bonus Points item: repeatable any number of times per day, resets daily,
  // `pts` may be negative (deduction). `target` is unused for Bonus items.
  isDaily?: boolean;
  target?: number;  // how many times to complete (Daily goals only; default 1)
}

export interface Reward {
  id: number;
  emoji: string;       // legacy fallback; rendered only when `icon` is unset/unknown
  icon?: string;       // registered icon key (see data/icons.ts)
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
  icon?: string;       // registered icon key (see data/icons.ts)
}

export type Theme = 'classic' | 'midnight' | 'ocean' | 'bubblegum' | 'cyberpunk';

export interface Settings {
  foodPts: number;
  bonusPts: number;
  pin: string;
  childName: string;
  recoveryQuestion: string;
  recoveryAnswer: string;
  theme: Theme;
  avatarIcon: string;       // registered icon key (see data/icons.ts)
  avatarIconColor: string;  // hex color for the avatar icon glyph
  avatarBgColor: string;    // hex color for the avatar circle background
}

export interface DayLog {
  foodCounts: Record<string, number>;
  goalIds: number[];
  points: number;
  bonusCounts?: Record<number, number>; // tap counts for Bonus Points items, keyed by goal id
  bonusApplied?: Record<number, number>; // points actually applied per Bonus item this day (signed, forgiveness-aware) — mirrors GravyState.todayBonusApplied
}

export interface GravyState {
  points: number;
  totalPoints: number;
  streak: number;
  foodStreak: number;
  goalStreak: number;
  megaStreak: number;
  lastActiveDate: string | null;
  todayPoints: number;
  todayFoodCounts: Record<string, number>;
  todayGoals: number[];
  todayGoalCounts: Record<number, number>;
  // Points actually applied per Bonus item today (signed). Penalties are forgiven when the
  // kid is broke (capped at the current balance), so this records what was really deducted/
  // added so an undo reverses exactly that — never handing back points that were forgiven.
  todayBonusApplied: Record<number, number>;
  dayLogs: Record<string, DayLog>;
  pendingRewards: PendingReward[];
  earnedBadges: string[];
  counters: Counters;
  badgeConfig: Record<string, BadgeOverride>;
  goals: Goal[];
  rewards: Reward[];
  settings: Settings;
}

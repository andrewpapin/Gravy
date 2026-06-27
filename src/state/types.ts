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
  gamesPlayed: number;
  gamesWon: number;
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
  gamePts: number;
  // PIN and recovery answer are never stored or synced in plaintext — only a salted
  // SHA-256 hash. See src/state/hash.ts.
  pinHash: string;
  pinSalt: string;
  childName: string;
  recoveryQuestion: string;
  recoveryAnswerHash: string;
  recoveryAnswerSalt: string;
  theme: Theme;
  avatarIcon: string;       // registered icon key (see data/icons.ts)
  avatarIconColor: string;  // hex color for the avatar icon glyph
  avatarBgColor: string;    // hex color for the avatar circle background
  // IANA zone id (e.g. 'America/New_York'). Household-wide, not per-kid — see
  // SHARED_SETTING_KEYS in defaultState.ts. Determines the day boundary used by
  // todayStr()/applyDayRollover() regardless of any device's own system timezone.
  timezone: string;
}

export interface DayLog {
  foodCounts: Record<string, number>;
  goalIds: number[];
  points: number;
  bonusCounts?: Record<number, number>; // tap counts for Bonus Points items, keyed by goal id
  bonusApplied?: Record<number, number>; // points actually applied per Bonus item this day (signed, forgiveness-aware) — mirrors GravyState.todayBonusApplied
}

export type ActionLogType =
  | 'food'
  | 'goal'
  | 'bonus'
  | 'game'
  | 'rewardRequested'
  | 'rewardApproved'
  | 'rewardDeclined';

// One row per kid-progress action (food/goal/bonus/game/reward), shown in the grown-ups-only
// Log screen. `itemId`/`dateStr` together identify the live item an entry can be undone
// against — see src/state/actionLog.ts for the undo-eligibility/most-recent-only rules.
export interface ActionLogEntry {
  id: string;
  type: ActionLogType;
  label: string;
  pts: number;
  dateStr: string;
  at: number;
  itemId?: number | string;
  undone?: boolean;
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
  todayGameWins: number;
  dayLogs: Record<string, DayLog>;
  pendingRewards: PendingReward[];
  earnedBadges: string[];
  counters: Counters;
  badgeConfig: Record<string, BadgeOverride>;
  goals: Goal[];
  rewards: Reward[];
  settings: Settings;
  // Chronological record of every kid-progress/reward action, for the grown-ups-only Log
  // screen. Per-kid, never mirrored — see SHARED_SETTING_KEYS in defaultState.ts.
  actionLog: ActionLogEntry[];
}

// One kid. Holds a complete GravyState; the shared fields (goals, rewards, badgeConfig and the
// shared settings — see SHARED_SETTING_KEYS in defaultState.ts) are mirrored across every profile
// so the active profile's GravyState can flow through the app unchanged.
export interface ProfileEntry {
  id: string;
  state: GravyState;
}

// Top-level persisted shape (localStorage + the Supabase household `state` column).
export interface GravyRoot {
  version: 2;
  activeProfileId: string;
  profiles: ProfileEntry[];
}

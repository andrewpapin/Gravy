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
  valueUsd?: number;   // real-world dollar value, parent-entered; optional, drives the points-to-dollars estimate
}

export interface PendingReward {
  id: string;
  rewardId: number;
}

export type PendingPointsKind = 'goal' | 'food' | 'bonus' | 'game' | 'rollgoal';

// A point-earning action taken on a device with no signed-in account (a "kid-only" device
// joined via family code only — see GravyContext's `requiresApproval`). The completion itself
// (todayGoals/todayFoodCounts/counters/streaks) applies immediately; only the points sit
// here, out of the live balance, until a parent approves or declines them from the Approvals
// screen. `kind`+`itemId` is how the exact-inverse actions (decrementGoal, removeFood,
// undoBonusItem, declineGameWin) find and cancel a still-pending award instead of touching the
// balance — see src/state/pendingPoints.ts.
export interface PendingPointsAward {
  id: string;
  kind: PendingPointsKind;
  itemId: number | string;
  pts: number;
  label: string;
  at: number;
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

export type Theme = 'capri' | 'classic' | 'twopointoh';

export type CollapsibleSection = 'foodGoals' | 'dailyGoals' | 'bonusPoints';

export interface Settings {
  // Points awarded per food item, keyed by Food.id (see src/data/foods.ts) — each food group
  // has its own independently configurable point value.
  foodPtsByItem: Record<string, number>;
  bonusPts: number;
  gamePts: number;
  childName: string;
  theme: Theme;
  avatarIcon: string;       // registered icon key (see data/icons.ts)
  avatarIconColor: string;  // hex color for the avatar icon glyph
  avatarBgColor: string;    // hex color for the avatar circle background
  // IANA zone id (e.g. 'America/New_York'). Household-wide, not per-kid — see
  // SHARED_SETTING_KEYS in defaultState.ts. Determines the day boundary used by
  // todayStr()/applyDayRollover() regardless of any device's own system timezone.
  timezone: string;
  // Which home-screen goal cards this kid has collapsed. Per-kid UI preference — not in
  // SHARED_SETTING_KEYS, so each profile keeps its own.
  collapsedSections: Partial<Record<CollapsibleSection, boolean>>;
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
  | 'rewardDeclined'
  | 'pointsApproved'
  | 'pointsDeclined';

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
  // Which parent account performed this action (Epic 8 item 5). Absent on entries logged with
  // no signed-in account (legacy / anonymous-parent), which the Log renders without an actor.
  // Deliberately just the opaque auth user id — no email/label, since the log is part of the
  // synced household payload (Epic 9); the Log resolves a display name client-side.
  actorUserId?: string;
}

// Dashboard-level / destructive actions that the kid-progress actionLog deliberately excludes —
// catalog edits, settings, profile CRUD, danger-zone resets, sync changes. Shown
// in the grown-ups-only Admin Log (Epic 8 item 6). Informational only; never undoable here.
export type AuditLogType =
  | 'goalAdded' | 'goalUpdated' | 'goalRemoved'
  | 'rewardAdded' | 'rewardUpdated' | 'rewardRemoved'
  | 'settingChanged'
  | 'profileAdded' | 'profileUpdated' | 'profileRemoved'
  | 'resetToday' | 'resetAll'
  | 'syncEnabled' | 'syncJoined' | 'syncDisabled' | 'syncCodeChanged' | 'syncDeleted'
  | 'householdClaimed';

export interface AuditLogEntry {
  id: string;
  type: AuditLogType;
  label: string;
  at: number;
  // Opaque auth user id only — see ActionLogEntry.actorUserId for why there's no email/label.
  actorUserId?: string;
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
  // Roll to the Goal has its own independent 3-rounds/day structure — NOT gated by, or counted
  // toward, todayGameWins/DAILY_GAME_WIN_CAP (that cap is for every other arcade game's payouts).
  rollGoalRoundsToday: number;
  // Sum of today's completed Roll to the Goal rounds' 0-500(+reroll-bonus) display scores (the
  // "Final Daily Score" shown to the kid) — separate from the real Gravy points awarded per round.
  rollGoalDailyScore: number;
  dayLogs: Record<string, DayLog>;
  pendingRewards: PendingReward[];
  // Points earned on a kid-only device (no signed-in account) awaiting parent approval — see
  // PendingPointsAward. Per-kid, never mirrored, same as pendingRewards.
  pendingPointsAwards: PendingPointsAward[];
  counters: Counters;
  goals: Goal[];
  rewards: Reward[];
  settings: Settings;
  // Chronological record of every kid-progress/reward action, for the grown-ups-only Log
  // screen. Per-kid, never mirrored — see SHARED_SETTING_KEYS in defaultState.ts.
  actionLog: ActionLogEntry[];
  // Household-level admin/destructive-action history (Epic 8 item 6) for the grown-ups-only
  // Admin Log. Unlike actionLog this IS a shared field (mirrored across profiles by
  // mirrorSharedFields/copySharedInto), since these are household-wide config changes.
  auditLog: AuditLogEntry[];
}

// One kid. Holds a complete GravyState; the shared fields (goals, rewards and the
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

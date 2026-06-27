import type { ActionLogEntry, AuditLogEntry, GravyState, GravyRoot, ProfileEntry, Settings, Theme, Goal, Reward, PendingReward } from './types';
import { FOODS } from '../data/foods';
import { hashWithSalt, randomSaltHex } from './hash';
import { safeGetItem, safeSetItem } from './storage';
import { DEFAULT_TIMEZONE, isValidTimezone } from '../data/timezones';

export const STORAGE_KEY = 'gravy_v1';
// Lives here (not in Onboarding.tsx) so App.tsx can read it without a static import that
// would pull the lazy-loaded Onboarding component back into the main bundle.
export const ONBOARDING_DONE_KEY = 'gravy_onboarded';

// Fixed salt for the shipped default PIN only — the value '1234' is already public
// (documented as the default), so there's nothing to protect by randomizing it. Any
// PIN a parent actually sets gets a fresh random salt (see saveSetting/migration below).
const DEFAULT_PIN_SALT = 'gravy-default-pin-salt-v1';
const DEFAULT_PIN_HASH = hashWithSalt('1234', DEFAULT_PIN_SALT);

export const defaultState: GravyState = {
  points: 0,
  totalPoints: 0,
  streak: 0,
  foodStreak: 0,
  goalStreak: 0,
  megaStreak: 0,
  lastActiveDate: null,
  todayPoints: 0,
  todayFoodCounts: {},
  todayGoals: [],
  todayGoalCounts: {},
  todayBonusApplied: {},
  todayGameWins: 0,
  dayLogs: {},
  pendingRewards: [],
  earnedBadges: [],
  actionLog: [],
  auditLog: [],
  counters: {
    foodLogs: {},
    fullTrayDays: 0,
    totalGoals: 0,
    allGoalsDays: 0,
    comboDays: 0,
    totalRewards: 0,
    maxDayPoints: 0,
    gamesPlayed: 0,
    gamesWon: 0,
  },
  badgeConfig: {},
  goals: [
    // Daily
    { id: 1, emoji: '📖', icon: 'bookOpen', name: 'Read for 30 minutes', pts: 15, isDaily: true },
    { id: 2, emoji: '🎨', icon: 'palette', name: '1 hour of creative time', pts: 20, isDaily: true },
    { id: 3, emoji: '🧹', icon: 'broom', name: 'Tidy your space without being asked', pts: 15, isDaily: true },
    { id: 4, emoji: '🦷', icon: 'tooth', name: 'Brush your teeth', pts: 5, isDaily: true },
    { id: 5, emoji: '🛏️', icon: 'bed', name: 'Make your bed', pts: 10, isDaily: true },
    { id: 6, emoji: '🏃', icon: 'personRunning', name: '30 minutes of outdoor activity', pts: 15, isDaily: true },
    { id: 7, emoji: '✌️', icon: 'handPeace', name: 'Kind to family members', pts: 10, isDaily: true },
    { id: 8, emoji: '📐', icon: 'calculator', name: 'Homework done without reminders', pts: 15, isDaily: true },
    // Bonus (repeatable, resets daily; negative pts = deduction)
    { id: 9, emoji: '📚', icon: 'bookOpen', name: 'Extra reading time', pts: 15, isDaily: false },
    { id: 10, emoji: '📵', icon: 'gamepad', name: 'Stopped screen time the first time asked', pts: 20, isDaily: false },
    { id: 11, emoji: '💚', icon: 'heart', name: 'Handled a frustrating moment calmly', pts: 10, isDaily: false },
    { id: 12, emoji: '🤝', icon: 'thumbsUp', name: 'Helped someone without being asked', pts: 15, isDaily: false },
    { id: 13, emoji: '🤬', icon: 'commentSlash', name: 'Swear jar', pts: -10, isDaily: false },
    { id: 14, emoji: '😡', icon: 'faceAngry', name: 'Sore loser or rage quitting', pts: -15, isDaily: false },
    { id: 15, emoji: '🍟', icon: 'cookieBite', name: 'Junk food as a "meal"', pts: -20, isDaily: false },
  ],
  rewards: [
    { id: 1, emoji: '🎮', icon: 'gamepad', name: '30 extra minutes of screen time', cost: 40 },
    { id: 2, emoji: '🌙', icon: 'moon', name: 'Stay up 15 minutes past bedtime', cost: 50 },
    { id: 3, emoji: '🍦', icon: 'iceCream', name: 'Pick a special treat or dessert', cost: 75 },
    { id: 4, emoji: '🍽️', icon: 'bowlFood', name: "Pick what's for dinner", cost: 100 },
    { id: 5, emoji: '⭐', icon: 'star', name: 'Friend hangout or special outing', cost: 150 },
    { id: 6, emoji: '💰', icon: 'moneyBill', name: '$5 allowance', cost: 200 },
  ],
  settings: {
    foodPts: 10,
    bonusPts: 25,
    gamePts: 15,
    pinHash: DEFAULT_PIN_HASH,
    pinSalt: DEFAULT_PIN_SALT,
    childName: 'Zack',
    recoveryQuestion: '',
    recoveryAnswerHash: '',
    recoveryAnswerSalt: '',
    theme: 'classic',
    avatarIcon: 'faceSmile',
    avatarIconColor: '#2F3E46',
    avatarBgColor: '#FFFFFF',
    timezone: DEFAULT_TIMEZONE,
  },
};

export function cloneDefaultState(): GravyState {
  return JSON.parse(JSON.stringify(defaultState));
}

// Formats a date as YYYY-MM-DD in the given IANA zone — this is also how the date shown in
// the UI (Greeting, CalendarPanel) is computed, so the app has one consistent notion of
// "today" instead of two. Every device in a household uses the same configured
// Settings.timezone (see SHARED_SETTING_KEYS), so "today" no longer depends on each
// device's own system clock/timezone.
function dateStrInZone(d: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function todayStr(timezone: string = DEFAULT_TIMEZONE): string {
  return dateStrInZone(new Date(), timezone);
}

// Shifts a YYYY-MM-DD string by `delta` days. Anchored in UTC purely as a calendar-math
// trick (so setUTCDate can't be perturbed by DST) — it has nothing to do with the zone the
// dateStr itself was computed in.
export function addDaysToDateStr(dateStr: string, delta: number): string {
  const [y, m, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  d.setUTCDate(d.getUTCDate() + delta);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Formats a YYYY-MM-DD string as a calendar date (e.g. "Thursday, June 25") without
// reinterpreting it through any timezone — the string already names a specific day, not a
// moment in time, so it's rendered via a local midnight Date rather than `todayStr`'s
// timezone-aware path.
export function formatFriendlyDate(dateStr: string): string {
  const [y, m, day] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(dateStr: string): string {
  const [y, m, day] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });
}

// Migrates saved state that was written by an older version of the app
// (when the data model used "chores"/"todayChores"/"choreIds" terminology).
// Safe to call multiple times — checks before overwriting.
export function migrateLegacyState(state: Record<string, unknown>): void {
  // Top-level field renames
  if ('chores' in state && !('goals' in state)) {
    state.goals = state.chores;
    delete state.chores;
  }
  if ('todayChores' in state && !('todayGoals' in state)) {
    state.todayGoals = state.todayChores;
    delete state.todayChores;
  }

  // Backfill isDaily on existing goals (undefined => true)
  if (Array.isArray(state.goals)) {
    for (const g of state.goals as Record<string, unknown>[]) {
      if (!('isDaily' in g)) g.isDaily = true;
    }
  }

  // NOTE: the `icon` field (goals/rewards/badge overrides) is additive and intentionally
  // NOT backfilled here. Items created before the icon system keep only their `emoji`
  // string and render via the emoji fallback (see components/AppIcon.tsx) until a parent
  // edits them and picks an icon. This keeps the change safe for Supabase last-write-wins.

  // Backfill todayGoalCounts from todayGoals for saves that predate count tracking
  if (!state.todayGoalCounts && Array.isArray(state.todayGoals) && Array.isArray(state.goals)) {
    const counts: Record<number, number> = {};
    for (const id of state.todayGoals as number[]) {
      const goal = (state.goals as Record<string, unknown>[]).find((g) => g.id === id);
      counts[id] = (goal?.target as number | undefined) || 1;
    }
    state.todayGoalCounts = counts;
  }

  // Counter renames
  const counters = state.counters as Record<string, unknown> | undefined;
  if (counters) {
    if ('totalChores' in counters && !('totalGoals' in counters)) {
      counters.totalGoals = counters.totalChores;
      delete counters.totalChores;
    }
    if ('allChoresDays' in counters && !('allGoalsDays' in counters)) {
      counters.allGoalsDays = counters.allChoresDays;
      delete counters.allChoresDays;
    }
  }

  // dayLogs[*].choreIds -> goalIds
  const dayLogs = state.dayLogs as Record<string, Record<string, unknown>> | undefined;
  if (dayLogs) {
    for (const log of Object.values(dayLogs)) {
      if ('choreIds' in log && !('goalIds' in log)) {
        log.goalIds = log.choreIds;
        delete log.choreIds;
      }
    }
  }

  // Theme ids were replaced (light/dark/rainbow/gold -> classic/midnight/ocean/
  // bubblegum/cyberpunk); fall back to the new default for any unrecognized value.
  const settings = state.settings as Record<string, unknown> | undefined;
  if (settings) {
    const validThemes = ['classic', 'midnight', 'ocean', 'bubblegum', 'cyberpunk'];
    if (!validThemes.includes(settings.theme as string)) {
      settings.theme = 'classic';
    }
  }

  // PIN and recovery answer used to be stored as plaintext. Hash any plaintext value found
  // (one-time, on first load after upgrading) and delete the original field immediately —
  // it must never reach the typed GravyState, since that's what gets autosaved/synced.
  if (settings) {
    if (typeof settings.pin === 'string' && !('pinHash' in settings)) {
      const pin = settings.pin.slice(0, 4) || '1234';
      const salt = randomSaltHex();
      settings.pinHash = hashWithSalt(pin, salt);
      settings.pinSalt = salt;
    }
    delete settings.pin;
    if (typeof settings.recoveryAnswer === 'string' && !('recoveryAnswerHash' in settings)) {
      const answer = settings.recoveryAnswer.trim().toLowerCase();
      if (answer) {
        const salt = randomSaltHex();
        settings.recoveryAnswerHash = hashWithSalt(answer, salt);
        settings.recoveryAnswerSalt = salt;
      } else {
        settings.recoveryAnswerHash = '';
        settings.recoveryAnswerSalt = '';
      }
    }
    delete settings.recoveryAnswer;
  }
}

// Walks backward day-by-day from yesterday through `dayLogs`, replaying the same
// full-tray/all-goals conditions `applyDayRollover` uses, to seed foodStreak/goalStreak/
// megaStreak for saves written before these fields existed (so upgrading doesn't reset
// an in-progress streak to 0).
export function backfillStreaksFromLogs(state: GravyState): void {
  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  let foodStreak = 0;
  let goalStreak = 0;
  let megaStreak = 0;
  let trackingFood = true;
  let trackingGoal = true;
  let trackingMega = true;
  let dateStr = addDaysToDateStr(todayStr(state.settings.timezone), -1);
  for (let i = 0; i < 3650 && (trackingFood || trackingGoal || trackingMega); i++) {
    const log = state.dayLogs[dateStr];
    if (!log) break;
    const fullTray = FOODS.every((f) => (log.foodCounts[f.id] || 0) > 0);
    const allGoalsDone = dailyGoals.length > 0 && dailyGoals.every((g) => log.goalIds.includes(g.id));
    if (trackingFood && fullTray) foodStreak++; else trackingFood = false;
    if (trackingGoal && allGoalsDone) goalStreak++; else trackingGoal = false;
    if (trackingMega && fullTray && allGoalsDone) megaStreak++; else trackingMega = false;
    dateStr = addDaysToDateStr(dateStr, -1);
  }
  state.foodStreak = foodStreak;
  state.goalStreak = goalStreak;
  state.megaStreak = megaStreak;
}

function asFiniteNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function asPlainObject(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function asNumberArray(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : [];
}

function sanitizeGoals(v: unknown): Goal[] {
  const cleaned = Array.isArray(v)
    ? v.filter(
        (g): g is Goal =>
          !!g && typeof g === 'object' && typeof (g as Goal).id === 'number' &&
          typeof (g as Goal).name === 'string' && typeof (g as Goal).pts === 'number',
      )
    : [];
  return cleaned.length > 0 ? cleaned : JSON.parse(JSON.stringify(defaultState.goals));
}

function sanitizeRewards(v: unknown): Reward[] {
  const cleaned = Array.isArray(v)
    ? v.filter(
        (r): r is Reward =>
          !!r && typeof r === 'object' && typeof (r as Reward).id === 'number' &&
          typeof (r as Reward).name === 'string' && typeof (r as Reward).cost === 'number',
      )
    : [];
  return cleaned.length > 0 ? cleaned : JSON.parse(JSON.stringify(defaultState.rewards));
}

function sanitizePendingRewards(v: unknown): PendingReward[] {
  return Array.isArray(v)
    ? v.filter(
        (p): p is PendingReward =>
          !!p && typeof p === 'object' && typeof (p as PendingReward).id === 'string' &&
          typeof (p as PendingReward).rewardId === 'number',
      )
    : [];
}

function sanitizeActionLog(v: unknown): ActionLogEntry[] {
  return Array.isArray(v)
    ? v.filter(
        (e): e is ActionLogEntry =>
          !!e && typeof e === 'object' && typeof (e as ActionLogEntry).id === 'string' &&
          typeof (e as ActionLogEntry).type === 'string' && typeof (e as ActionLogEntry).dateStr === 'string',
      )
    : [];
}

function sanitizeAuditLog(v: unknown): AuditLogEntry[] {
  return Array.isArray(v)
    ? v.filter(
        (e): e is AuditLogEntry =>
          !!e && typeof e === 'object' && typeof (e as AuditLogEntry).id === 'string' &&
          typeof (e as AuditLogEntry).type === 'string' && typeof (e as AuditLogEntry).label === 'string',
      )
    : [];
}

// Coerces fields that are present but have the wrong runtime type/shape back to a safe
// default, rather than letting a malformed payload — a buggy peer client, hand-edited
// localStorage, or (if Supabase RLS is ever misconfigured) a third party writing directly to
// a household row — propagate NaNs/non-arrays into arithmetic and iteration deeper in the app.
function sanitizeState(state: GravyState): void {
  state.points = asFiniteNumber(state.points, 0);
  state.totalPoints = asFiniteNumber(state.totalPoints, 0);
  state.streak = asFiniteNumber(state.streak, 0);
  state.foodStreak = asFiniteNumber(state.foodStreak, 0);
  state.goalStreak = asFiniteNumber(state.goalStreak, 0);
  state.megaStreak = asFiniteNumber(state.megaStreak, 0);
  state.todayPoints = asFiniteNumber(state.todayPoints, 0);
  state.lastActiveDate = typeof state.lastActiveDate === 'string' ? state.lastActiveDate : null;

  state.todayFoodCounts = asPlainObject(state.todayFoodCounts) as Record<string, number>;
  state.todayGoalCounts = asPlainObject(state.todayGoalCounts) as Record<number, number>;
  state.todayBonusApplied = asPlainObject(state.todayBonusApplied) as Record<number, number>;
  state.dayLogs = asPlainObject(state.dayLogs) as GravyState['dayLogs'];
  state.badgeConfig = asPlainObject(state.badgeConfig) as GravyState['badgeConfig'];

  state.todayGoals = asNumberArray(state.todayGoals);
  state.earnedBadges = asStringArray(state.earnedBadges);
  state.pendingRewards = sanitizePendingRewards(state.pendingRewards);
  state.goals = sanitizeGoals(state.goals);
  state.rewards = sanitizeRewards(state.rewards);
  state.actionLog = sanitizeActionLog(state.actionLog);
  state.auditLog = sanitizeAuditLog(state.auditLog);

  const counters = state.counters as unknown as Record<string, unknown>;
  counters.fullTrayDays = asFiniteNumber(counters.fullTrayDays, 0);
  counters.totalGoals = asFiniteNumber(counters.totalGoals, 0);
  counters.allGoalsDays = asFiniteNumber(counters.allGoalsDays, 0);
  counters.comboDays = asFiniteNumber(counters.comboDays, 0);
  counters.totalRewards = asFiniteNumber(counters.totalRewards, 0);
  counters.maxDayPoints = asFiniteNumber(counters.maxDayPoints, 0);
  counters.foodLogs = asPlainObject(counters.foodLogs);

  const settings = state.settings as unknown as Record<string, unknown>;
  settings.pinHash = asString(settings.pinHash, defaultState.settings.pinHash);
  settings.pinSalt = asString(settings.pinSalt, defaultState.settings.pinSalt);
  settings.recoveryAnswerHash = asString(settings.recoveryAnswerHash, '');
  settings.recoveryAnswerSalt = asString(settings.recoveryAnswerSalt, '');
  settings.recoveryQuestion = asString(settings.recoveryQuestion, '');
  settings.childName = asString(settings.childName, defaultState.settings.childName);
  settings.avatarIcon = asString(settings.avatarIcon, defaultState.settings.avatarIcon);
  settings.avatarIconColor = asString(settings.avatarIconColor, defaultState.settings.avatarIconColor);
  settings.avatarBgColor = asString(settings.avatarBgColor, defaultState.settings.avatarBgColor);
  settings.foodPts = asFiniteNumber(settings.foodPts, defaultState.settings.foodPts);
  settings.bonusPts = asFiniteNumber(settings.bonusPts, defaultState.settings.bonusPts);
  settings.timezone = isValidTimezone(settings.timezone) ? settings.timezone : defaultState.settings.timezone;
}

// Takes a raw parsed flat GravyState (or null/garbage), runs the legacy migration, backfills any
// missing top-level/settings/counter fields and streaks, then validates field types/shapes
// before applying the day rollover. Shared by every code path that hydrates a single profile's
// state (initial load + incoming Supabase rows).
export function hydrateState(raw: unknown): GravyState {
  let state: GravyState;
  if (raw && typeof raw === 'object') {
    migrateLegacyState(raw as Record<string, unknown>);
    state = raw as GravyState;
  } else {
    state = cloneDefaultState();
  }
  const stateRecord = state as unknown as Record<string, unknown>;
  const hadStreakFields =
    'foodStreak' in stateRecord || 'goalStreak' in stateRecord || 'megaStreak' in stateRecord;
  for (const k of Object.keys(defaultState) as (keyof GravyState)[]) {
    if (!(k in state)) {
      stateRecord[k] = JSON.parse(JSON.stringify(defaultState[k]));
    }
  }
  if (!state.settings) state.settings = { ...defaultState.settings };
  const settingsRecord = state.settings as unknown as Record<string, unknown>;
  for (const k of Object.keys(defaultState.settings) as (keyof GravyState['settings'])[]) {
    if (!(k in state.settings)) settingsRecord[k] = defaultState.settings[k];
  }
  // Validated again (redundantly but harmlessly) below in sanitizeState — done here too so an
  // invalid/garbage saved value can't blow up Intl.DateTimeFormat inside backfillStreaksFromLogs.
  if (!isValidTimezone(state.settings.timezone)) state.settings.timezone = defaultState.settings.timezone;
  if (!hadStreakFields) backfillStreaksFromLogs(state);
  if (!state.counters) state.counters = JSON.parse(JSON.stringify(defaultState.counters));
  const countersRecord = state.counters as unknown as Record<string, unknown>;
  for (const k of Object.keys(defaultState.counters) as (keyof GravyState['counters'])[]) {
    if (!(k in state.counters)) countersRecord[k] = defaultState.counters[k];
  }
  if (!state.counters.foodLogs) state.counters.foodLogs = {};
  if (!state.badgeConfig) state.badgeConfig = {};
  sanitizeState(state);
  return applyDayRollover(state);
}

export function loadState(): GravyState {
  try {
    const saved = safeGetItem(STORAGE_KEY);
    return hydrateState(saved ? JSON.parse(saved) : null);
  } catch {
    return applyDayRollover(cloneDefaultState());
  }
}

// Returns whether the write actually persisted, so callers can warn the user instead of
// silently losing progress (e.g. quota exceeded, or storage disabled in private browsing).
export function saveState(state: GravyState): boolean {
  return safeSetItem(STORAGE_KEY, JSON.stringify(state));
}

// ---- Profiles (multi-kid) ----------------------------------------------------------------

// Settings shared by every kid in the household. The rest of Settings (childName, the three
// avatar fields, theme) is per-kid. Goals, rewards and badgeConfig are also shared (mirrored
// across profiles by mirrorSharedFields).
export const SHARED_SETTING_KEYS: (keyof Settings)[] = [
  'foodPts',
  'bonusPts',
  'gamePts',
  'pinHash',
  'pinSalt',
  'recoveryQuestion',
  'recoveryAnswerHash',
  'recoveryAnswerSalt',
  'timezone',
];

function genProfileId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function copySharedInto(dest: GravyState, src: GravyState): void {
  dest.goals = JSON.parse(JSON.stringify(src.goals));
  dest.rewards = JSON.parse(JSON.stringify(src.rewards));
  dest.badgeConfig = JSON.parse(JSON.stringify(src.badgeConfig));
  // The Admin Log is a household-wide history, so it's a shared field mirrored across profiles.
  dest.auditLog = JSON.parse(JSON.stringify(src.auditLog ?? []));
  const destSettings = dest.settings as unknown as Record<string, unknown>;
  for (const k of SHARED_SETTING_KEYS) destSettings[k] = src.settings[k];
}

// Pushes the shared fields from the active profile (where all parent config edits happen) into
// every other profile, so goals/rewards/points-config/PIN/recovery stay identical across kids.
// Per-kid fields (progress, name, avatar, theme) are left untouched.
export function mirrorSharedFields(root: GravyRoot): void {
  const active = root.profiles.find((p) => p.id === root.activeProfileId);
  if (!active) return;
  for (const entry of root.profiles) {
    if (entry.id === active.id) continue;
    copySharedInto(entry.state, active.state);
  }
}

// Builds a fresh profile that inherits the shared config from an existing setup but starts with
// zeroed progress and its own identity (name / avatar / theme).
export function makeNewProfile(
  name: string,
  sharedFrom: GravyState,
  opts?: { avatarIcon?: string; avatarIconColor?: string; avatarBgColor?: string; theme?: Theme },
): ProfileEntry {
  const state = cloneDefaultState();
  copySharedInto(state, sharedFrom);
  state.settings.childName = name.trim() || 'Kid';
  if (opts?.avatarIcon) state.settings.avatarIcon = opts.avatarIcon;
  if (opts?.avatarIconColor) state.settings.avatarIconColor = opts.avatarIconColor;
  if (opts?.avatarBgColor) state.settings.avatarBgColor = opts.avatarBgColor;
  if (opts?.theme) state.settings.theme = opts.theme;
  state.lastActiveDate = null;
  return { id: genProfileId(), state };
}

export function loadRoot(): GravyRoot {
  try {
    const saved = safeGetItem(STORAGE_KEY);
    const raw = saved ? JSON.parse(saved) : null;
    if (raw && Array.isArray(raw.profiles)) {
      const root = raw as GravyRoot;
      root.version = 2;
      root.profiles = root.profiles
        .filter((p) => p && p.state)
        .map((p) => ({ id: p.id || genProfileId(), state: hydrateState(p.state) }));
      if (root.profiles.length === 0) {
        const entry = makeNewProfile(defaultState.settings.childName, defaultState);
        root.profiles = [entry];
        root.activeProfileId = entry.id;
      }
      if (!root.profiles.some((p) => p.id === root.activeProfileId)) {
        root.activeProfileId = root.profiles[0].id;
      }
      mirrorSharedFields(root);
      return root;
    }
    // Legacy flat GravyState (or empty) → wrap as a single profile.
    const entry: ProfileEntry = { id: genProfileId(), state: hydrateState(raw) };
    return { version: 2, activeProfileId: entry.id, profiles: [entry] };
  } catch {
    const entry: ProfileEntry = { id: genProfileId(), state: applyDayRollover(cloneDefaultState()) };
    return { version: 2, activeProfileId: entry.id, profiles: [entry] };
  }
}

// Returns whether the write actually persisted, so callers can warn the user instead of
// silently losing progress (e.g. quota exceeded, or storage disabled in private browsing).
export function saveRoot(root: GravyRoot): boolean {
  return safeSetItem(STORAGE_KEY, JSON.stringify(root));
}

export function applyDayRollover(state: GravyState): GravyState {
  const today = todayStr(state.settings.timezone);
  if (state.lastActiveDate && state.lastActiveDate !== today) {
    const yStr = addDaysToDateStr(today, -1);
    const hadActivity =
      Object.keys(state.todayFoodCounts).length > 0 ||
      state.todayGoals.length > 0 ||
      state.todayPoints > 0 ||
      Object.values(state.todayGoalCounts || {}).some((c) => c > 0);
    // The streak only extends if the day being closed out had real activity logged —
    // just having the app open isn't enough, otherwise the streak couldn't ever be "at risk".
    if (state.lastActiveDate === yStr && hadActivity) {
      state.streak++;
    } else {
      state.streak = 0;
    }
    const fullTray = FOODS.every((f) => (state.todayFoodCounts[f.id] || 0) > 0);
    const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
    const allGoalsDone = dailyGoals.length > 0 && dailyGoals.every((g) => state.todayGoals.includes(g.id));
    const closedOutYesterday = state.lastActiveDate === yStr;
    state.foodStreak = closedOutYesterday && fullTray ? state.foodStreak + 1 : 0;
    state.goalStreak = closedOutYesterday && allGoalsDone ? state.goalStreak + 1 : 0;
    state.megaStreak = closedOutYesterday && fullTray && allGoalsDone ? state.megaStreak + 1 : 0;
    if (hadActivity) {
      const bonusIds = new Set(
        (state.goals || []).filter((g) => g.isDaily === false).map((g) => g.id)
      );
      const bonusCounts: Record<number, number> = {};
      for (const [id, count] of Object.entries(state.todayGoalCounts || {})) {
        if (bonusIds.has(Number(id))) bonusCounts[Number(id)] = count;
      }
      state.dayLogs[state.lastActiveDate] = {
        foodCounts: { ...state.todayFoodCounts },
        goalIds: [...state.todayGoals],
        points: state.todayPoints,
        bonusCounts,
      };
    }
    state.todayFoodCounts = {};
    state.todayPoints = 0;
    // Daily goals and Bonus Points items both reset daily — every completion (and stale
    // legacy one-time-goal id) is cleared, not just the ones tied to current goal ids.
    state.todayGoals = [];
    state.todayGoalCounts = {};
    // Bonus penalties settle at the end of the day — start the new day with a clean ledger.
    state.todayBonusApplied = {};
    state.todayGameWins = 0;
  }
  state.lastActiveDate = today;
  return state;
}

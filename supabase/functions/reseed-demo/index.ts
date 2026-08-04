// Scheduled reseed for the shared, unclaimed Demo Mode household (code TRYDEM) — see
// CLAUDE.md/BACKLOG.md "Demo Mode" and src/state/demoData.ts on the client side.
//
// This is a deliberately self-contained Deno copy of src/state/demoData.ts (plus the slice of
// src/state/defaultState.ts and src/data/foods.ts it depends on), NOT a shared import — Deno's
// module resolution requires explicit .ts extensions on relative imports, which this Vite/tsc
// project's source tree doesn't use, so reaching into src/ directly isn't a clean fit for the
// edge function bundler. If the generation logic in src/state/demoData.ts changes, mirror the
// change here too. Kept behaviorally identical on purpose — src/state/demoData.test.ts is the
// spec both copies should satisfy.
import { createClient } from 'npm:@supabase/supabase-js@2';

// ---------------------------------------------------------------------------------------------
// Mirrors src/data/foods.ts
// ---------------------------------------------------------------------------------------------
interface Food { id: string; emoji: string; icon: string; label: string; }
const FOODS: Food[] = [
  { id: 'fruit', emoji: '🍎', icon: 'appleWhole', label: 'Fruit' },
  { id: 'veggie', emoji: '🥦', icon: 'carrot', label: 'Veggie' },
  { id: 'protein', emoji: '🍗', icon: 'drumstickBite', label: 'Protein' },
  { id: 'dairy', emoji: '🥛', icon: 'glassWater', label: 'Dairy' },
  { id: 'grain', emoji: '🍞', icon: 'breadSlice', label: 'Grain' },
  { id: 'sweets', emoji: '🍬', icon: 'iceCream', label: 'Sweets' },
];

// ---------------------------------------------------------------------------------------------
// Mirrors src/state/types.ts (only the fields this generator touches)
// ---------------------------------------------------------------------------------------------
interface Goal { id: number; emoji: string; icon?: string; name: string; pts: number; isDaily?: boolean; target?: number; }
interface Reward { id: number; emoji: string; icon?: string; name: string; cost: number; }
interface PendingReward { id: string; rewardId: number; }
type ActionLogType = 'food' | 'goal' | 'bonus' | 'oops' | 'game' | 'rewardRequested' | 'rewardApproved' | 'rewardDeclined' | 'pointsApproved' | 'pointsDeclined';
interface ActionLogEntry { id: string; type: ActionLogType; label: string; pts: number; dateStr: string; at: number; itemId?: number | string; undone?: boolean; }
type AuditLogType = 'goalAdded' | 'goalUpdated' | 'goalRemoved' | 'rewardAdded' | 'rewardUpdated' | 'rewardRemoved' | 'settingChanged' | 'profileAdded' | 'profileUpdated' | 'profileRemoved' | 'resetToday' | 'resetAll' | 'syncEnabled' | 'syncJoined' | 'syncDisabled' | 'syncCodeChanged' | 'syncDeleted' | 'householdClaimed';
interface AuditLogEntry { id: string; type: AuditLogType; label: string; at: number; }
interface RollToGoalRoundLogEntry { round: number; tier: 'exact' | 'near1' | 'near2' | 'far' | 'bust'; total: number; displayScore: number; pts: number; pending: boolean; at: number; }
interface DayLog { foodCounts: Record<string, number>; goalIds: number[]; points: number; bonusCounts?: Record<number, number>; bonusApplied?: Record<number, number>; }
type Theme = 'capri' | 'classic' | 'twopointoh';
interface Settings {
  foodPtsByItem: Record<string, number>; bonusPts: number; gamePts: number; childName: string; theme: Theme;
  avatarIcon: string; avatarIconColor: string; avatarBgColor: string; timezone: string;
  collapsedSections: Partial<Record<string, boolean>>;
}
interface Counters { foodLogs: Record<string, number>; fullTrayDays: number; totalGoals: number; allGoalsDays: number; comboDays: number; totalRewards: number; maxDayPoints: number; gamesPlayed: number; gamesWon: number; }
interface GravyState {
  points: number; totalPoints: number; streak: number; foodStreak: number; goalStreak: number; megaStreak: number;
  lastActiveDate: string | null; todayPoints: number; todayFoodCounts: Record<string, number>; todayGoals: number[];
  todayGoalCounts: Record<number, number>; todayBonusApplied: Record<number, number>; rollGoalRoundsToday: number;
  rollGoalDailyScore: number; rollGoalRoundsLog: RollToGoalRoundLogEntry[]; dayLogs: Record<string, DayLog>;
  pendingRewards: PendingReward[]; pendingPointsAwards: unknown[]; counters: Counters; goals: Goal[]; rewards: Reward[];
  settings: Settings; actionLog: ActionLogEntry[]; auditLog: AuditLogEntry[];
}
interface ProfileEntry { id: string; state: GravyState; }
interface GravyRoot { version: 2; activeProfileId: string; profiles: ProfileEntry[]; }

// ---------------------------------------------------------------------------------------------
// Mirrors src/state/defaultState.ts (the slice createDemoRoot needs)
// ---------------------------------------------------------------------------------------------
const DEFAULT_TIMEZONE = 'America/New_York';
const DEFAULT_FOOD_PTS = 10;

const defaultState: GravyState = {
  points: 0, totalPoints: 0, streak: 0, foodStreak: 0, goalStreak: 0, megaStreak: 0, lastActiveDate: null,
  todayPoints: 0, todayFoodCounts: {}, todayGoals: [], todayGoalCounts: {}, todayBonusApplied: {},
  rollGoalRoundsToday: 0, rollGoalDailyScore: 0, rollGoalRoundsLog: [], dayLogs: {}, pendingRewards: [],
  pendingPointsAwards: [], actionLog: [], auditLog: [],
  counters: { foodLogs: {}, fullTrayDays: 0, totalGoals: 0, allGoalsDays: 0, comboDays: 0, totalRewards: 0, maxDayPoints: 0, gamesPlayed: 0, gamesWon: 0 },
  goals: [
    { id: 1, emoji: '📖', icon: 'bookOpen', name: 'Read for 30 minutes', pts: 15, isDaily: true },
    { id: 2, emoji: '🎨', icon: 'palette', name: '1 hour of creative time', pts: 20, isDaily: true },
    { id: 3, emoji: '🧹', icon: 'broom', name: 'Tidy your space without being asked', pts: 15, isDaily: true },
    { id: 4, emoji: '🦷', icon: 'tooth', name: 'Brush your teeth', pts: 5, isDaily: true },
    { id: 5, emoji: '🛏️', icon: 'bed', name: 'Make your bed', pts: 10, isDaily: true },
    { id: 6, emoji: '🏃', icon: 'personRunning', name: '30 minutes of outdoor activity', pts: 15, isDaily: true },
    { id: 7, emoji: '✌️', icon: 'handPeace', name: 'Kind to family members', pts: 10, isDaily: true },
    { id: 8, emoji: '📐', icon: 'calculator', name: 'Homework done without reminders', pts: 15, isDaily: true },
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
    foodPtsByItem: Object.fromEntries(FOODS.map((f) => [f.id, DEFAULT_FOOD_PTS])),
    bonusPts: 25, gamePts: 15, childName: 'Zack', theme: 'capri', avatarIcon: 'faceSmile',
    avatarIconColor: '#2F3E46', avatarBgColor: '#FFFFFF', timezone: DEFAULT_TIMEZONE, collapsedSections: {},
  },
};

function cloneDefaultState(): GravyState {
  return JSON.parse(JSON.stringify(defaultState));
}

function dateStrInZone(d: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function todayStr(timezone: string = DEFAULT_TIMEZONE): string {
  return dateStrInZone(new Date(), timezone);
}

function addDaysToDateStr(dateStr: string, delta: number): string {
  const [y, m, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  d.setUTCDate(d.getUTCDate() + delta);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function backfillStreaksFromLogs(state: GravyState): void {
  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  let foodStreak = 0, goalStreak = 0, megaStreak = 0;
  let trackingFood = true, trackingGoal = true, trackingMega = true;
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

function applyDayRollover(state: GravyState): GravyState {
  const today = todayStr(state.settings.timezone);
  if (state.lastActiveDate && state.lastActiveDate !== today) {
    // Not exercised by createDemoRoot (lastActiveDate is always set to today before this runs),
    // so the full rollover branch isn't reproduced here — see defaultState.ts for the real one.
  }
  state.lastActiveDate = today;
  return state;
}

const SHARED_SETTING_KEYS: (keyof Settings)[] = ['foodPtsByItem', 'bonusPts', 'gamePts', 'timezone'];

function genId(): string {
  return crypto.randomUUID();
}

function copySharedInto(dest: GravyState, src: GravyState): void {
  dest.goals = JSON.parse(JSON.stringify(src.goals));
  dest.rewards = JSON.parse(JSON.stringify(src.rewards));
  dest.auditLog = JSON.parse(JSON.stringify(src.auditLog ?? []));
  const destSettings = dest.settings as unknown as Record<string, unknown>;
  for (const k of SHARED_SETTING_KEYS) {
    const v = src.settings[k];
    destSettings[k as string] = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
  }
}

function mirrorSharedFields(root: GravyRoot): void {
  const active = root.profiles.find((p) => p.id === root.activeProfileId);
  if (!active) return;
  for (const entry of root.profiles) {
    if (entry.id === active.id) continue;
    copySharedInto(entry.state, active.state);
  }
}

function makeNewProfile(
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
  return { id: genId(), state };
}

// ---------------------------------------------------------------------------------------------
// Mirrors src/state/demoData.ts
// ---------------------------------------------------------------------------------------------
interface DayPlan { fullTray: boolean; goalsDone: number; bonusGoalId?: number; }

function dayTimestamp(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

let logSeq = 0;
function logEntry(type: ActionLogType, label: string, pts: number, dateStr: string, at: number, itemId?: number | string): ActionLogEntry {
  logSeq += 1;
  return { id: `demo-${at}-${logSeq}`, type, label, pts, dateStr, at, ...(itemId !== undefined ? { itemId } : {}) };
}

function buildHistory(state: GravyState, plans: DayPlan[], timezone: string): { dayLogs: Record<string, DayLog>; actionLog: ActionLogEntry[] } {
  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  const dayLogs: Record<string, DayLog> = {};
  const actionLog: ActionLogEntry[] = [];
  let dateStr = addDaysToDateStr(todayStr(timezone), -1);
  for (const plan of plans) {
    const at = dayTimestamp(dateStr);
    const foodCounts: Record<string, number> = {};
    let points = 0;
    for (const f of FOODS) {
      if (!plan.fullTray && f.id === 'sweets') continue;
      foodCounts[f.id] = 1;
      const pts = state.settings.foodPtsByItem[f.id] ?? 10;
      points += pts;
      actionLog.push(logEntry('food', `Logged ${f.label}`, pts, dateStr, at, f.id));
    }
    const goalIds: number[] = [];
    for (let i = 0; i < plan.goalsDone && i < dailyGoals.length; i++) {
      const g = dailyGoals[i];
      goalIds.push(g.id);
      points += g.pts;
      actionLog.push(logEntry('goal', g.name, g.pts, dateStr, at, g.id));
    }
    let bonusCounts: Record<number, number> | undefined;
    let bonusApplied: Record<number, number> | undefined;
    const bonus = plan.bonusGoalId != null ? state.goals.find((g) => g.id === plan.bonusGoalId) : undefined;
    if (bonus) {
      bonusCounts = { [bonus.id]: 1 };
      bonusApplied = { [bonus.id]: bonus.pts };
      points += bonus.pts;
      actionLog.push(logEntry('bonus', bonus.name, bonus.pts, dateStr, at, bonus.id));
    }
    dayLogs[dateStr] = { foodCounts, goalIds, points, ...(bonusCounts ? { bonusCounts, bonusApplied } : {}) };
    dateStr = addDaysToDateStr(dateStr, -1);
  }
  return { dayLogs, actionLog };
}

function computeCounters(
  dayLogs: Record<string, DayLog>,
  dailyGoalCount: number,
  today: { foodCounts: Record<string, number>; goalIds: number[]; points: number },
  gamesPlayed: number,
  gamesWon: number,
  totalRewards: number,
): Counters {
  const foodLogs: Record<string, number> = {};
  let fullTrayDays = 0, totalGoals = 0, allGoalsDays = 0, comboDays = 0, maxDayPoints = today.points;
  for (const log of Object.values(dayLogs)) {
    for (const [id, count] of Object.entries(log.foodCounts)) foodLogs[id] = (foodLogs[id] || 0) + count;
    const fullTray = FOODS.every((f) => (log.foodCounts[f.id] || 0) > 0);
    const allGoals = dailyGoalCount > 0 && log.goalIds.length === dailyGoalCount;
    if (fullTray) fullTrayDays++;
    if (allGoals) allGoalsDays++;
    if (fullTray && allGoals) comboDays++;
    totalGoals += log.goalIds.length;
    if (log.points > maxDayPoints) maxDayPoints = log.points;
  }
  for (const [id, count] of Object.entries(today.foodCounts)) foodLogs[id] = (foodLogs[id] || 0) + count;
  totalGoals += today.goalIds.length;
  return { foodLogs, fullTrayDays, totalGoals, allGoalsDays, comboDays, totalRewards, maxDayPoints, gamesPlayed, gamesWon };
}

function auditEntry(type: AuditLogType, label: string, at: number): AuditLogEntry {
  logSeq += 1;
  return { id: `demo-audit-${at}-${logSeq}`, type, label, at };
}

interface KidSpec {
  history: DayPlan[];
  today: { goalsDone: number; foodIds: string[]; game?: RollToGoalRoundLogEntry[] };
  approvedRewardId?: number;
  pendingRewardId: number;
  gamesPlayed: number;
  gamesWon: number;
}

function populateKid(state: GravyState, spec: KidSpec): void {
  const timezone = state.settings.timezone;
  const dailyGoals = state.goals.filter((g) => g.isDaily !== false);
  const { dayLogs, actionLog } = buildHistory(state, spec.history, timezone);
  state.dayLogs = dayLogs;
  state.actionLog = actionLog;

  const todayGoals = dailyGoals.slice(0, spec.today.goalsDone).map((g) => g.id);
  const todayGoalCounts: Record<number, number> = {};
  for (const id of todayGoals) todayGoalCounts[id] = 1;
  const todayFoodCounts: Record<string, number> = {};
  const today = todayStr(timezone);
  const nowAt = dayTimestamp(today);
  let todayPoints = 0;
  for (const foodId of spec.today.foodIds) {
    todayFoodCounts[foodId] = 1;
    const pts = state.settings.foodPtsByItem[foodId] ?? 10;
    todayPoints += pts;
    const food = FOODS.find((f) => f.id === foodId);
    if (food) actionLog.push(logEntry('food', `Logged ${food.label}`, pts, today, nowAt, food.id));
  }
  for (const id of todayGoals) {
    const g = dailyGoals.find((gg) => gg.id === id);
    if (!g) continue;
    todayPoints += g.pts;
    actionLog.push(logEntry('goal', g.name, g.pts, today, nowAt, g.id));
  }
  const rollGoalRoundsLog = spec.today.game ?? [];
  for (const round of rollGoalRoundsLog) {
    todayPoints += round.pts;
    actionLog.push(logEntry('game', `Roll to the Goal — round ${round.round}`, round.pts, today, round.at));
  }

  state.todayFoodCounts = todayFoodCounts;
  state.todayGoals = todayGoals;
  state.todayGoalCounts = todayGoalCounts;
  state.todayBonusApplied = {};
  state.todayPoints = todayPoints;
  state.rollGoalRoundsToday = rollGoalRoundsLog.length;
  state.rollGoalDailyScore = rollGoalRoundsLog.reduce((sum, r) => sum + r.displayScore, 0);
  state.rollGoalRoundsLog = rollGoalRoundsLog;

  const historyTotal = Object.values(dayLogs).reduce((sum, log) => sum + log.points, 0);
  state.totalPoints = historyTotal + todayPoints;

  const pendingReward = { id: genId(), rewardId: spec.pendingRewardId };
  state.pendingRewards = [pendingReward];
  actionLog.push(logEntry('rewardRequested', 'Reward requested!', 0, today, nowAt, spec.pendingRewardId));

  let approvedCost = 0;
  let totalRewardRequests = 1;
  if (spec.approvedRewardId != null) {
    const reward = state.rewards.find((r) => r.id === spec.approvedRewardId);
    if (reward) {
      approvedCost = reward.cost;
      totalRewardRequests += 1;
      const approvedAt = dayTimestamp(addDaysToDateStr(today, -3));
      actionLog.push(logEntry('rewardRequested', 'Reward requested!', 0, addDaysToDateStr(today, -3), approvedAt - 1000, reward.id));
      actionLog.push(logEntry('rewardApproved', `${reward.name} approved!`, -reward.cost, addDaysToDateStr(today, -3), approvedAt, reward.id));
    }
  }
  state.points = state.totalPoints - approvedCost;

  state.counters = computeCounters(
    dayLogs, dailyGoals.length,
    { foodCounts: todayFoodCounts, goalIds: todayGoals, points: todayPoints },
    spec.gamesPlayed, spec.gamesWon, totalRewardRequests,
  );

  state.streak = spec.history.length;
  state.lastActiveDate = today;
  backfillStreaksFromLogs(state);
  applyDayRollover(state);
}

function createDemoRoot(): GravyRoot {
  const mayaState = cloneDefaultState();
  mayaState.settings.childName = 'Maya';
  mayaState.settings.avatarIcon = 'faceGrinStars';
  mayaState.settings.avatarIconColor = '#C1440E';
  mayaState.settings.avatarBgColor = '#FFF3E0';
  mayaState.settings.theme = 'capri';

  const mayaHistory: DayPlan[] = [
    { fullTray: true, goalsDone: 8, bonusGoalId: 9 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 7 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: false, goalsDone: 8 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 8, bonusGoalId: 13 },
    { fullTray: true, goalsDone: 6 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 8 },
  ];

  populateKid(mayaState, {
    history: mayaHistory,
    today: {
      goalsDone: 4,
      foodIds: ['fruit', 'veggie', 'protein'],
      game: [
        { round: 1, tier: 'near1', total: 46, displayScore: 460, pts: 20, pending: false, at: dayTimestamp(todayStr(mayaState.settings.timezone)) + 1000 },
        { round: 2, tier: 'bust', total: 12, displayScore: 120, pts: 0, pending: false, at: dayTimestamp(todayStr(mayaState.settings.timezone)) + 2000 },
      ],
    },
    approvedRewardId: 2,
    pendingRewardId: 4,
    gamesPlayed: 14,
    gamesWon: 6,
  });

  mayaState.auditLog = [
    auditEntry('profileAdded', 'Added profile: Leo', dayTimestamp(addDaysToDateStr(todayStr(mayaState.settings.timezone), -10))),
    auditEntry('settingChanged', 'Updated points for Veggie to 10 pts', dayTimestamp(addDaysToDateStr(todayStr(mayaState.settings.timezone), -6))),
    auditEntry('goalUpdated', 'Updated goal: 1 hour of creative time', dayTimestamp(addDaysToDateStr(todayStr(mayaState.settings.timezone), -2))),
  ];

  const mayaEntry: ProfileEntry = { id: genId(), state: mayaState };

  const leoEntry = makeNewProfile('Leo', mayaState, {
    avatarIcon: 'userAstronaut', avatarIconColor: '#3D5A80', avatarBgColor: '#E8F1F8', theme: 'twopointoh',
  });

  const leoHistory: DayPlan[] = [
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 6 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: false, goalsDone: 8 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 5 },
    { fullTray: true, goalsDone: 8 },
    { fullTray: true, goalsDone: 8 },
  ];

  populateKid(leoEntry.state, {
    history: leoHistory,
    today: { goalsDone: 2, foodIds: ['fruit'] },
    pendingRewardId: 2,
    gamesPlayed: 7,
    gamesWon: 2,
  });

  const root: GravyRoot = { version: 2, activeProfileId: mayaEntry.id, profiles: [mayaEntry, leoEntry] };
  mirrorSharedFields(root);
  return root;
}

// ---------------------------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------------------------
const DEMO_HOUSEHOLD_CODE = 'TRYDEM';

Deno.serve(async (req: Request) => {
  const expectedSecret = Deno.env.get('RESEED_SECRET');
  if (expectedSecret && req.headers.get('x-reseed-secret') !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const root = createDemoRoot();
  // Service-role upsert bypasses RLS. Only code/state/updated_at are ever written — owner_id is
  // deliberately never touched, so the demo household stays unclaimed no matter how many times
  // this runs (a fresh insert leaves it at its column default of NULL; an update on conflict only
  // SETs the three columns listed, leaving any existing owner_id — which should always be NULL
  // for this row — untouched).
  const { error } = await supabase
    .from('households')
    .upsert({ code: DEMO_HOUSEHOLD_CODE, state: root, updated_at: new Date().toISOString() }, { onConflict: 'code' });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ ok: true, code: DEMO_HOUSEHOLD_CODE }), { headers: { 'Content-Type': 'application/json' } });
});

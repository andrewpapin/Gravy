import type { IconKey } from './icons';

// Fire on first occurrence, no threshold.
type SimpleBadgeTrigger = 'first_food' | 'first_chore' | 'first_reward' | 'first_game';

// Take a numeric `:N` threshold — see comment below for what each counts.
type ThresholdBadgeTriggerType =
  | 'food_count' | 'full_tray' | 'chore_count' | 'all_chores' | 'pts' | 'pts_day'
  | 'streak' | 'reward_count' | 'combo' | 'fruit' | 'veggie' | 'protein' | 'dairy' | 'grain'
  | 'games_won';

// Constrains `BadgeDef.trigger` to a known type so a typo (e.g. `'friut:5'`) is a
// compile error instead of a silently dead/zero-threshold badge at runtime.
export type BadgeTrigger = SimpleBadgeTrigger | `${ThresholdBadgeTriggerType}:${number}`;

export interface BadgeDef {
  id: string;
  emoji: string;   // legacy fallback
  icon: IconKey;   // registered icon key (see data/icons.ts)
  name: string;
  desc: string;
  trigger: BadgeTrigger;
  group: string;
}

// trigger types:
//   first_food, first_chore, first_reward   — fires on first occurrence (no threshold)
//   food_count:N     — total individual food group logs >= N
//   full_tray:N      — full tray days >= N
//   chore_count:N    — total chores completed (cumulative) >= N
//   all_chores:N     — "all chores done in a day" days >= N
//   pts:N            — totalPoints >= N
//   pts_day:N        — points earned in a single day >= N
//   streak:N         — consecutive day streak >= N
//   reward_count:N   — total rewards requested >= N
//   combo:N          — full tray + all chores same day, N times
//   fruit:N, veggie:N, protein:N, dairy:N, grain:N  — specific food logged N times
//   first_game       — fires on first game round won (no threshold)
//   games_won:N      — total games won (cumulative) >= N

export const BADGE_MASTER: BadgeDef[] = [
  // ── FOOD (12) ──────────────────────────────────────────────────────
  { id: 'first_food',    emoji: '🥦', icon: 'bowlFood',      name: 'First Bite',       desc: 'Log your very first food group',          trigger: 'first_food',  group: 'Food' },
  { id: 'fruit5',       emoji: '🍎', icon: 'appleWhole',     name: 'Apple a Day',       desc: 'Log fruit 5 times',                       trigger: 'fruit:5',     group: 'Food' },
  { id: 'veggie5',      emoji: '🥕', icon: 'carrot',         name: 'Veggie Lover',      desc: 'Log veggies 5 times',                     trigger: 'veggie:5',    group: 'Food' },
  { id: 'protein5',     emoji: '🍗', icon: 'drumstickBite',  name: 'Protein Pro',       desc: 'Log protein 5 times',                     trigger: 'protein:5',   group: 'Food' },
  { id: 'dairy5',       emoji: '🥛', icon: 'glassWater',     name: 'Got Milk',          desc: 'Log dairy 5 times',                       trigger: 'dairy:5',     group: 'Food' },
  { id: 'grain5',       emoji: '🍞', icon: 'breadSlice',     name: 'Carb Commander',    desc: 'Log grains 5 times',                      trigger: 'grain:5',     group: 'Food' },
  { id: 'full_tray1',   emoji: '🍽️', icon: 'utensils',       name: 'Full Tray',         desc: 'Eat all 5 food groups in one day',        trigger: 'full_tray:1', group: 'Food' },
  { id: 'full_tray3',   emoji: '🌟', icon: 'star',           name: 'Tray Trio',         desc: 'Eat all 5 food groups 3 days',            trigger: 'full_tray:3', group: 'Food' },
  { id: 'full_tray7',   emoji: '🌈', icon: 'rainbow',        name: 'Rainbow Week',      desc: 'Eat all 5 food groups 7 days',            trigger: 'full_tray:7', group: 'Food' },
  { id: 'full_tray30',  emoji: '🏆', icon: 'trophy',         name: 'Tray Legend',       desc: 'Eat all 5 food groups 30 days',           trigger: 'full_tray:30',group: 'Food' },
  { id: 'food_count25', emoji: '🍴', icon: 'bowlRice',       name: 'Munch Machine',     desc: 'Log 25 food groups total',                trigger: 'food_count:25',group:'Food' },
  { id: 'food_count50', emoji: '🍱', icon: 'bowlFood',       name: 'Plate Pro',         desc: 'Log 50 food groups total',                trigger: 'food_count:50',group:'Food' },
  { id: 'food_count100',emoji: '💪', icon: 'dumbbell',       name: 'Nutrition Ninja',   desc: 'Log 100 food groups total',               trigger: 'food_count:100',group:'Food'},

  // ── CHORES (12) ────────────────────────────────────────────────────
  { id: 'first_chore',  emoji: '⭐', icon: 'star',           name: 'Helper',            desc: 'Complete your very first chore',          trigger: 'first_chore', group: 'Chores' },
  { id: 'chore5',       emoji: '🦸', icon: 'broom',          name: 'Super Helper',      desc: 'Complete 5 chores total',                 trigger: 'chore_count:5',  group: 'Chores' },
  { id: 'chore10',      emoji: '🔧', icon: 'screwdriverWrench', name: 'Handy Kid',      desc: 'Complete 10 chores total',                trigger: 'chore_count:10', group: 'Chores' },
  { id: 'chore25',      emoji: '🏗️', icon: 'helmetSafety',   name: 'Builder',           desc: 'Complete 25 chores total',                trigger: 'chore_count:25', group: 'Chores' },
  { id: 'chore50',      emoji: '🦾', icon: 'gears',          name: 'Iron Worker',       desc: 'Complete 50 chores total',                trigger: 'chore_count:50', group: 'Chores' },
  { id: 'chore100',     emoji: '🤖', icon: 'robot',          name: 'Chore Bot',         desc: 'Complete 100 chores total',               trigger: 'chore_count:100',group:'Chores' },
  { id: 'all_chores1',  emoji: '✅', icon: 'circleCheck',    name: 'Clean Sweep',       desc: 'Finish all chores in one day',            trigger: 'all_chores:1',   group: 'Chores' },
  { id: 'all_chores3',  emoji: '🎯', icon: 'bullseye',       name: 'Hat Trick',         desc: 'Finish all chores 3 days',                trigger: 'all_chores:3',   group: 'Chores' },
  { id: 'all_chores7',  emoji: '💥', icon: 'burst',          name: 'Unstoppable',       desc: 'Finish all chores 7 days',                trigger: 'all_chores:7',   group: 'Chores' },
  { id: 'all_chores14', emoji: '🌊', icon: 'water',          name: 'Chore Tsunami',     desc: 'Finish all chores 14 days',               trigger: 'all_chores:14',  group: 'Chores' },
  { id: 'all_chores30', emoji: '🏅', icon: 'medal',          name: 'Legendary Cleaner', desc: 'Finish all chores 30 days',               trigger: 'all_chores:30',  group: 'Chores' },
  { id: 'chore_streak7',emoji: '🔥', icon: 'fire',           name: 'Chore Streak',      desc: 'Use the app 7 days in a row',             trigger: 'streak:7',       group: 'Chores' },
  { id: 'chore200',     emoji: '🏆', icon: 'trophy',         name: 'Chore Champion',    desc: 'Complete 200 chores total',               trigger: 'chore_count:200',group: 'Chores' },

  // ── POINTS (12) ────────────────────────────────────────────────────
  { id: 'pts50',        emoji: '🌱', icon: 'seedling',       name: 'Just Starting',     desc: 'Earn 50 points total',                    trigger: 'pts:50',      group: 'Points' },
  { id: 'pts100',       emoji: '💯', icon: 'star',           name: 'Century',           desc: 'Earn 100 points total',                   trigger: 'pts:100',     group: 'Points' },
  { id: 'pts250',       emoji: '🎖️', icon: 'award',          name: 'Quarter Grand',     desc: 'Earn 250 points total',                   trigger: 'pts:250',     group: 'Points' },
  { id: 'pts500',       emoji: '💎', icon: 'gem',            name: 'Diamond',           desc: 'Earn 500 points total',                   trigger: 'pts:500',     group: 'Points' },
  { id: 'pts750',       emoji: '🚀', icon: 'rocket',         name: 'Rocket',            desc: 'Earn 750 points total',                   trigger: 'pts:750',     group: 'Points' },
  { id: 'pts1000',      emoji: '👑', icon: 'crown',          name: 'Point King',        desc: 'Earn 1,000 points total',                 trigger: 'pts:1000',    group: 'Points' },
  { id: 'pts1500',      emoji: '🌙', icon: 'moon',           name: 'Moonshot',          desc: 'Earn 1,500 points total',                 trigger: 'pts:1500',    group: 'Points' },
  { id: 'pts2000',      emoji: '🌠', icon: 'meteor',         name: 'Star Power',        desc: 'Earn 2,000 points total',                 trigger: 'pts:2000',    group: 'Points' },
  { id: 'pts2500',      emoji: '🛰️', icon: 'satellite',      name: 'Orbit Master',      desc: 'Earn 2,500 points total',                 trigger: 'pts:2500',    group: 'Points' },
  { id: 'pts3000',      emoji: '🌌', icon: 'brain',          name: 'Galaxy Brain',      desc: 'Earn 3,000 points total',                 trigger: 'pts:3000',    group: 'Points' },
  { id: 'pts4000',      emoji: '☄️', icon: 'meteor',         name: 'Comet Chaser',      desc: 'Earn 4,000 points total',                 trigger: 'pts:4000',    group: 'Points' },
  { id: 'pts5000',      emoji: '🦄', icon: 'wandMagicSparkles', name: 'Unicorn',        desc: 'Earn 5,000 points total',                 trigger: 'pts:5000',    group: 'Points' },
  { id: 'pts7500',      emoji: '💥', icon: 'burst',          name: 'Supernova',        desc: 'Earn 7,500 points total',                 trigger: 'pts:7500',    group: 'Points' },
  { id: 'pts10000',     emoji: '🐉', icon: 'dragon',         name: 'Cosmic Legend',     desc: 'Earn 10,000 points total',                trigger: 'pts:10000',   group: 'Points' },

  // ── STREAKS (10) ───────────────────────────────────────────────────
  { id: 'streak2',      emoji: '✌️', icon: 'handPeace',      name: 'Two Days',          desc: 'Use the app 2 days in a row',             trigger: 'streak:2',    group: 'Streaks' },
  { id: 'streak3',      emoji: '🔥', icon: 'fire',           name: 'On Fire',           desc: 'Use the app 3 days in a row',             trigger: 'streak:3',    group: 'Streaks' },
  { id: 'streak5',      emoji: '⚡', icon: 'bolt',           name: 'Lightning',         desc: 'Use the app 5 days in a row',             trigger: 'streak:5',    group: 'Streaks' },
  { id: 'streak7',      emoji: '🌋', icon: 'volcano',        name: 'Inferno',           desc: 'Use the app 7 days in a row',             trigger: 'streak:7',    group: 'Streaks' },
  { id: 'streak9',      emoji: '🎆', icon: 'burst',          name: 'Hot Streak',        desc: 'Use the app 9 days in a row',             trigger: 'streak:9',    group: 'Streaks' },
  { id: 'streak10',     emoji: '💫', icon: 'star',           name: 'Ten Day Hero',      desc: 'Use the app 10 days in a row',            trigger: 'streak:10',   group: 'Streaks' },
  { id: 'streak14',     emoji: '🦅', icon: 'dove',           name: 'Two Weeks Strong',  desc: 'Use the app 14 days in a row',            trigger: 'streak:14',   group: 'Streaks' },
  { id: 'streak18',     emoji: '🌪️', icon: 'wind',           name: 'Storm Chaser',      desc: 'Use the app 18 days in a row',            trigger: 'streak:18',   group: 'Streaks' },
  { id: 'streak21',     emoji: '🏔️', icon: 'mountain',       name: 'Mountain Top',      desc: 'Use the app 21 days in a row',            trigger: 'streak:21',   group: 'Streaks' },
  { id: 'streak30',     emoji: '🌞', icon: 'sun',            name: 'Month Master',      desc: 'Use the app 30 days in a row',            trigger: 'streak:30',   group: 'Streaks' },
  { id: 'streak60',     emoji: '🏅', icon: 'medal',          name: 'Two-Month Marathon',desc: 'Use the app 60 days in a row',            trigger: 'streak:60',   group: 'Streaks' },
  { id: 'streak100',    emoji: '💯', icon: 'crown',          name: 'Triple Digit Streak',desc: 'Use the app 100 days in a row',          trigger: 'streak:100',  group: 'Streaks' },

  // ── STORE (5) ──────────────────────────────────────────────────────
  { id: 'first_reward', emoji: '🎁', icon: 'gift',           name: 'Spender',           desc: 'Request your first reward',               trigger: 'first_reward',    group: 'Store' },
  { id: 'reward3',      emoji: '🛍️', icon: 'bagShopping',    name: 'Shopaholic',        desc: 'Request 3 rewards',                       trigger: 'reward_count:3',  group: 'Store' },
  { id: 'reward5',      emoji: '🛒', icon: 'cartShopping',   name: 'Cart Champion',     desc: 'Request 5 rewards',                       trigger: 'reward_count:5',  group: 'Store' },
  { id: 'reward10',     emoji: '💸', icon: 'moneyBillWave',  name: 'High Roller',       desc: 'Request 10 rewards',                      trigger: 'reward_count:10', group: 'Store' },
  { id: 'reward25',     emoji: '🤑', icon: 'sackDollar',     name: 'Reward Royalty',    desc: 'Request 25 rewards',                      trigger: 'reward_count:25', group: 'Store' },
  { id: 'reward50',     emoji: '🤑', icon: 'sackDollar',     name: 'Reward Tycoon',     desc: 'Request 50 rewards',                      trigger: 'reward_count:50', group: 'Store' },

  // ── COMBOS (9) ─────────────────────────────────────────────────────
  { id: 'combo1',       emoji: '🌮', icon: 'pizzaSlice',     name: 'Perfect Day',       desc: 'Full tray + all chores in one day',       trigger: 'combo:1',     group: 'Combos' },
  { id: 'combo3',       emoji: '🎪', icon: 'tent',           name: 'Hat Trick Hero',    desc: 'Perfect day 3 times',                     trigger: 'combo:3',     group: 'Combos' },
  { id: 'combo5',       emoji: '🎢', icon: 'ticket',         name: 'Streak of Perfect', desc: 'Perfect day 5 times',                     trigger: 'combo:5',     group: 'Combos' },
  { id: 'combo7',       emoji: '🎇', icon: 'burst',          name: 'Flawless Week',     desc: 'Perfect day 7 times',                     trigger: 'combo:7',     group: 'Combos' },
  { id: 'pts_day50',    emoji: '⚡', icon: 'bolt',           name: 'Big Day',           desc: 'Earn 50 points in a single day',          trigger: 'pts_day:50',  group: 'Combos' },
  { id: 'pts_day100',   emoji: '💣', icon: 'bomb',           name: 'Mega Day',          desc: 'Earn 100 points in a single day',         trigger: 'pts_day:100', group: 'Combos' },
  { id: 'all5foods10',  emoji: '🥗', icon: 'leaf',           name: 'Salad Days',        desc: 'Eat all 5 food groups 10 different days', trigger: 'full_tray:10',group: 'Combos' },
  { id: 'fruit10',      emoji: '🍓', icon: 'lemon',          name: 'Fruit Fanatic',     desc: 'Log fruit 10 times',                      trigger: 'fruit:10',    group: 'Combos' },
  { id: 'veggie10',     emoji: '🥦', icon: 'carrot',         name: 'Veggie Veteran',    desc: 'Log veggies 10 times',                    trigger: 'veggie:10',   group: 'Combos' },

  // ── GAMES (3) ──────────────────────────────────────────────────────
  { id: 'first_game',   emoji: '🔤', icon: 'font',           name: 'First Win!',        desc: 'Win your first game',                     trigger: 'first_game',     group: 'Games' },
  { id: 'games_won10',  emoji: '🧠', icon: 'brain',          name: 'Word Whiz',         desc: 'Win 10 games',                            trigger: 'games_won:10',   group: 'Games' },
  { id: 'games_won25',  emoji: '🏅', icon: 'medal',          name: 'Word Wizard',       desc: 'Win 25 games',                            trigger: 'games_won:25',   group: 'Games' },
  { id: 'games_won50',  emoji: '🎮', icon: 'gamepad',        name: 'Game Master',       desc: 'Win 50 games',                            trigger: 'games_won:50',   group: 'Games' },
];

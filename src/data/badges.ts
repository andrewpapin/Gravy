export interface BadgeDef {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  trigger: string;
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

export const BADGE_MASTER: BadgeDef[] = [
  // ── FOOD (12) ──────────────────────────────────────────────────────
  { id: 'first_food',    emoji: '🥦', name: 'First Bite',       desc: 'Log your very first food group',          trigger: 'first_food',  group: 'Food' },
  { id: 'fruit5',       emoji: '🍎', name: 'Apple a Day',       desc: 'Log fruit 5 times',                       trigger: 'fruit:5',     group: 'Food' },
  { id: 'veggie5',      emoji: '🥕', name: 'Veggie Lover',      desc: 'Log veggies 5 times',                     trigger: 'veggie:5',    group: 'Food' },
  { id: 'protein5',     emoji: '🍗', name: 'Protein Pro',       desc: 'Log protein 5 times',                     trigger: 'protein:5',   group: 'Food' },
  { id: 'dairy5',       emoji: '🥛', name: 'Got Milk',          desc: 'Log dairy 5 times',                       trigger: 'dairy:5',     group: 'Food' },
  { id: 'grain5',       emoji: '🍞', name: 'Carb Commander',    desc: 'Log grains 5 times',                      trigger: 'grain:5',     group: 'Food' },
  { id: 'full_tray1',   emoji: '🍽️', name: 'Full Tray',         desc: 'Eat all 5 food groups in one day',        trigger: 'full_tray:1', group: 'Food' },
  { id: 'full_tray3',   emoji: '🌟', name: 'Tray Trio',         desc: 'Eat all 5 food groups 3 days',            trigger: 'full_tray:3', group: 'Food' },
  { id: 'full_tray7',   emoji: '🌈', name: 'Rainbow Week',      desc: 'Eat all 5 food groups 7 days',            trigger: 'full_tray:7', group: 'Food' },
  { id: 'full_tray30',  emoji: '🏆', name: 'Tray Legend',       desc: 'Eat all 5 food groups 30 days',           trigger: 'full_tray:30',group: 'Food' },
  { id: 'food_count25', emoji: '🍴', name: 'Munch Machine',     desc: 'Log 25 food groups total',                trigger: 'food_count:25',group:'Food' },
  { id: 'food_count100',emoji: '💪', name: 'Nutrition Ninja',   desc: 'Log 100 food groups total',               trigger: 'food_count:100',group:'Food'},

  // ── CHORES (12) ────────────────────────────────────────────────────
  { id: 'first_chore',  emoji: '⭐', name: 'Helper',            desc: 'Complete your very first chore',          trigger: 'first_chore', group: 'Chores' },
  { id: 'chore5',       emoji: '🦸', name: 'Super Helper',      desc: 'Complete 5 chores total',                 trigger: 'chore_count:5',  group: 'Chores' },
  { id: 'chore10',      emoji: '🔧', name: 'Handy Kid',         desc: 'Complete 10 chores total',                trigger: 'chore_count:10', group: 'Chores' },
  { id: 'chore25',      emoji: '🏗️', name: 'Builder',           desc: 'Complete 25 chores total',                trigger: 'chore_count:25', group: 'Chores' },
  { id: 'chore50',      emoji: '🦾', name: 'Iron Worker',       desc: 'Complete 50 chores total',                trigger: 'chore_count:50', group: 'Chores' },
  { id: 'chore100',     emoji: '🤖', name: 'Chore Bot',         desc: 'Complete 100 chores total',               trigger: 'chore_count:100',group:'Chores' },
  { id: 'all_chores1',  emoji: '✅', name: 'Clean Sweep',       desc: 'Finish all chores in one day',            trigger: 'all_chores:1',   group: 'Chores' },
  { id: 'all_chores3',  emoji: '🎯', name: 'Hat Trick',         desc: 'Finish all chores 3 days',                trigger: 'all_chores:3',   group: 'Chores' },
  { id: 'all_chores7',  emoji: '💥', name: 'Unstoppable',       desc: 'Finish all chores 7 days',                trigger: 'all_chores:7',   group: 'Chores' },
  { id: 'all_chores14', emoji: '🌊', name: 'Chore Tsunami',     desc: 'Finish all chores 14 days',               trigger: 'all_chores:14',  group: 'Chores' },
  { id: 'all_chores30', emoji: '🏅', name: 'Legendary Cleaner', desc: 'Finish all chores 30 days',               trigger: 'all_chores:30',  group: 'Chores' },
  { id: 'chore_streak7',emoji: '🔥', name: 'Chore Streak',      desc: 'Use the app 7 days in a row',             trigger: 'streak:7',       group: 'Chores' },

  // ── POINTS (10) ────────────────────────────────────────────────────
  { id: 'pts50',        emoji: '🌱', name: 'Just Starting',     desc: 'Earn 50 points total',                    trigger: 'pts:50',      group: 'Points' },
  { id: 'pts100',       emoji: '💯', name: 'Century',           desc: 'Earn 100 points total',                   trigger: 'pts:100',     group: 'Points' },
  { id: 'pts250',       emoji: '🎖️', name: 'Quarter Grand',     desc: 'Earn 250 points total',                   trigger: 'pts:250',     group: 'Points' },
  { id: 'pts500',       emoji: '💎', name: 'Diamond',           desc: 'Earn 500 points total',                   trigger: 'pts:500',     group: 'Points' },
  { id: 'pts750',       emoji: '🚀', name: 'Rocket',            desc: 'Earn 750 points total',                   trigger: 'pts:750',     group: 'Points' },
  { id: 'pts1000',      emoji: '👑', name: 'Point King',        desc: 'Earn 1,000 points total',                 trigger: 'pts:1000',    group: 'Points' },
  { id: 'pts1500',      emoji: '🌙', name: 'Moonshot',          desc: 'Earn 1,500 points total',                 trigger: 'pts:1500',    group: 'Points' },
  { id: 'pts2000',      emoji: '🌠', name: 'Star Power',        desc: 'Earn 2,000 points total',                 trigger: 'pts:2000',    group: 'Points' },
  { id: 'pts3000',      emoji: '🌌', name: 'Galaxy Brain',      desc: 'Earn 3,000 points total',                 trigger: 'pts:3000',    group: 'Points' },
  { id: 'pts5000',      emoji: '🦄', name: 'Unicorn',           desc: 'Earn 5,000 points total',                 trigger: 'pts:5000',    group: 'Points' },

  // ── STREAKS (8) ────────────────────────────────────────────────────
  { id: 'streak2',      emoji: '✌️', name: 'Two Days',          desc: 'Use the app 2 days in a row',             trigger: 'streak:2',    group: 'Streaks' },
  { id: 'streak3',      emoji: '🔥', name: 'On Fire',           desc: 'Use the app 3 days in a row',             trigger: 'streak:3',    group: 'Streaks' },
  { id: 'streak5',      emoji: '⚡', name: 'Lightning',         desc: 'Use the app 5 days in a row',             trigger: 'streak:5',    group: 'Streaks' },
  { id: 'streak7',      emoji: '🌋', name: 'Inferno',           desc: 'Use the app 7 days in a row',             trigger: 'streak:7',    group: 'Streaks' },
  { id: 'streak10',     emoji: '💫', name: 'Ten Day Hero',      desc: 'Use the app 10 days in a row',            trigger: 'streak:10',   group: 'Streaks' },
  { id: 'streak14',     emoji: '🦅', name: 'Two Weeks Strong',  desc: 'Use the app 14 days in a row',            trigger: 'streak:14',   group: 'Streaks' },
  { id: 'streak21',     emoji: '🏔️', name: 'Mountain Top',      desc: 'Use the app 21 days in a row',            trigger: 'streak:21',   group: 'Streaks' },
  { id: 'streak30',     emoji: '🌞', name: 'Month Master',      desc: 'Use the app 30 days in a row',            trigger: 'streak:30',   group: 'Streaks' },

  // ── STORE (5) ──────────────────────────────────────────────────────
  { id: 'first_reward', emoji: '🎁', name: 'Spender',           desc: 'Request your first reward',               trigger: 'first_reward',    group: 'Store' },
  { id: 'reward3',      emoji: '🛍️', name: 'Shopaholic',        desc: 'Request 3 rewards',                       trigger: 'reward_count:3',  group: 'Store' },
  { id: 'reward5',      emoji: '🛒', name: 'Cart Champion',     desc: 'Request 5 rewards',                       trigger: 'reward_count:5',  group: 'Store' },
  { id: 'reward10',     emoji: '💸', name: 'High Roller',       desc: 'Request 10 rewards',                      trigger: 'reward_count:10', group: 'Store' },
  { id: 'reward25',     emoji: '🤑', name: 'Reward Royalty',    desc: 'Request 25 rewards',                      trigger: 'reward_count:25', group: 'Store' },

  // ── COMBOS (8) ─────────────────────────────────────────────────────
  { id: 'combo1',       emoji: '🌮', name: 'Perfect Day',       desc: 'Full tray + all chores in one day',       trigger: 'combo:1',     group: 'Combos' },
  { id: 'combo3',       emoji: '🎪', name: 'Hat Trick Hero',    desc: 'Perfect day 3 times',                     trigger: 'combo:3',     group: 'Combos' },
  { id: 'combo7',       emoji: '🎇', name: 'Flawless Week',     desc: 'Perfect day 7 times',                     trigger: 'combo:7',     group: 'Combos' },
  { id: 'pts_day50',    emoji: '⚡', name: 'Big Day',           desc: 'Earn 50 points in a single day',          trigger: 'pts_day:50',  group: 'Combos' },
  { id: 'pts_day100',   emoji: '💣', name: 'Mega Day',          desc: 'Earn 100 points in a single day',         trigger: 'pts_day:100', group: 'Combos' },
  { id: 'all5foods10',  emoji: '🥗', name: 'Salad Days',        desc: 'Eat all 5 food groups 10 different days', trigger: 'full_tray:10',group: 'Combos' },
  { id: 'fruit10',      emoji: '🍓', name: 'Fruit Fanatic',     desc: 'Log fruit 10 times',                      trigger: 'fruit:10',    group: 'Combos' },
  { id: 'veggie10',     emoji: '🥦', name: 'Veggie Veteran',    desc: 'Log veggies 10 times',                    trigger: 'veggie:10',   group: 'Combos' },
];

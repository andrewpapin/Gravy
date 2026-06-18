import type { IconKey } from './icons';

export interface Rank {
  name: string;
  emoji: string;   // legacy fallback
  icon: IconKey;   // registered icon key (see data/icons.ts)
  min: number;
  max: number;
}

export const RANKS: Rank[] = [
  { name: 'Snack Rookie', emoji: '🥚', icon: 'egg', min: 0, max: 100 },
  { name: 'Munch Apprentice', emoji: '🌱', icon: 'seedling', min: 100, max: 300 },
  { name: 'Fork Wielder', emoji: '🍴', icon: 'utensils', min: 300, max: 700 },
  { name: 'Grub Veteran', emoji: '⚔️', icon: 'shieldHalved', min: 700, max: 1500 },
  { name: 'Mega Muncher', emoji: '🌟', icon: 'star', min: 1500, max: 3000 },
  { name: 'Chomping Champion', emoji: '🏆', icon: 'trophy', min: 3000, max: 99999 },
];

export function getRank(pts: number): { rank: Rank; index: number } {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (pts >= RANKS[i].min) return { rank: RANKS[i], index: i };
  }
  return { rank: RANKS[0], index: 0 };
}

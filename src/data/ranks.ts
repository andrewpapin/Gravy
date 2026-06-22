import type { IconKey } from './icons';

export interface Rank {
  name: string;
  emoji: string;   // legacy fallback
  icon: IconKey;   // registered icon key (see data/icons.ts)
  min: number;
  max: number;
}

export const RANKS: Rank[] = [
  { name: 'Noob', emoji: '👶', icon: 'baby', min: 0, max: 50 },
  { name: 'Granny', emoji: '👵', icon: 'personCane', min: 50, max: 150 },
  { name: 'Green Monkey', emoji: '🐒', icon: 'paw', min: 150, max: 300 },
  { name: 'Orange Iguana', emoji: '🦎', icon: 'dragon', min: 300, max: 500 },
  { name: 'Purple Parrot', emoji: '🦜', icon: 'crow', min: 500, max: 750 },
  { name: 'Blue Barracuda', emoji: '🐠', icon: 'fishFins', min: 750, max: 1050 },
  { name: 'Red Jaguar', emoji: '🐆', icon: 'cat', min: 1050, max: 1400 },
  { name: 'Aura Farmer', emoji: '✨', icon: 'handSparkles', min: 1400, max: 1800 },
  { name: 'Silver Snake', emoji: '🐍', icon: 'staffSnake', min: 1800, max: 2250 },
  { name: 'Turbo Toad', emoji: '🐸', icon: 'frog', min: 2250, max: 2750 },
  { name: 'Shadow Shark', emoji: '🦈', icon: 'mask', min: 2750, max: 3300 },
  { name: 'Neon Narwhal', emoji: '🐬', icon: 'fish', min: 3300, max: 3900 },
  { name: 'Pixel Pirate', emoji: '🏴‍☠️', icon: 'skullCrossbones', min: 3900, max: 4550 },
  { name: 'Cyber Lotl', emoji: '🤖', icon: 'robot', min: 4550, max: 5250 },
  { name: 'Glitched Gamer', emoji: '🕹️', icon: 'microchip', min: 5250, max: 6000 },
  { name: 'Lava Llama', emoji: '🌋', icon: 'volcano', min: 6000, max: 6800 },
  { name: 'Cosmic Capybara', emoji: '🐹', icon: 'userAstronaut', min: 6800, max: 7650 },
  { name: 'Techno Tiger', emoji: '🐯', icon: 'robot', min: 7650, max: 8550 },
  { name: 'Static Squirrel', emoji: '🐿️', icon: 'bolt', min: 8550, max: 9500 },
  { name: 'Electric Eel', emoji: '⚡', icon: 'boltLightning', min: 9500, max: 10500 },
  { name: 'Retro Raptor', emoji: '🦖', icon: 'dragon', min: 10500, max: 11550 },
  { name: 'Frosty Fox', emoji: '🦊', icon: 'snowflake', min: 11550, max: 12650 },
  { name: 'Nitro Newt', emoji: '🏎️', icon: 'gaugeHigh', min: 12650, max: 13800 },
  { name: 'Sonic Snail', emoji: '🐌', icon: 'worm', min: 13800, max: 999999 },
];

export function getRank(pts: number): { rank: Rank; index: number } {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (pts >= RANKS[i].min) return { rank: RANKS[i], index: i };
  }
  return { rank: RANKS[0], index: 0 };
}

import type { IconKey } from './icons';

export interface GameDef {
  id: string;
  emoji: string;
  icon: IconKey;
  name: string;
  description: string;
  // Per-game point override; unset falls back to settings.gamePts so all games can
  // share one parent-configurable value until a future game needs its own.
  pts?: number;
  // True for a game whose payout varies per round (accuracy-scaled) rather than a flat award —
  // the hub tile shows "Daily Challenge" instead of a misleading flat "+N pts" badge.
  variablePayout?: boolean;
}

// The games catalog — currently just the one Daily Game (Roll to the Goal). Kept as an array
// (rather than a single constant) since getGamesBreakdown/GamesBreakdownSection still key off it
// for the game's name/icon.
export const GAMES: GameDef[] = [
  {
    id: 'rollgoal',
    emoji: '🎲',
    icon: 'dice',
    name: 'Roll to the Goal',
    description: "Roll 10 dice, up to 3 times, and get as close to today's target as you can!",
    variablePayout: true,
  },
];

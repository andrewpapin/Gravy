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
}

// The Games hub catalog — add new entries here to add a new game to the hub grid.
export const GAMES: GameDef[] = [
  {
    id: 'hangman',
    emoji: '🔤',
    icon: 'font',
    name: 'Hangman',
    description: 'Guess the word before you run out of tries!',
  },
  {
    id: 'mathfacts',
    emoji: '🧮',
    icon: 'calculator',
    name: 'Math Facts',
    description: 'Answer fast and get 7 right before 3 strikes!',
  },
  {
    id: 'scramble',
    emoji: '🔀',
    icon: 'shuffle',
    name: 'Word Scramble',
    description: 'Unscramble the letters to spell the word!',
  },
  {
    id: 'memory',
    emoji: '🧩',
    icon: 'clone',
    name: 'Memory Match',
    description: 'Flip cards and find all the matching pairs!',
  },
];

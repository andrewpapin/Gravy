import {
  faHandSparkles,
  faUtensils,
  faListCheck,
  faTrophy,
  faGift,
  faGamepad,
  faBars,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

export interface TourStep {
  // Matches a data-tour-id attribute on the home screen to spotlight — null means a centered
  // card with no spotlight cutout (used for the opening step, before anything's been pointed at).
  targetId: string | null;
  icon: IconDefinition;
  title: string;
  desc: (householdCode: string | null) => string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    targetId: null,
    icon: faHandSparkles,
    title: 'Quick Tour',
    desc: () => "Here's a fast look around Gravy.",
  },
  {
    targetId: 'food',
    icon: faUtensils,
    title: 'Food Goals',
    desc: () => 'Tap each food group your kid eats today — finish them all for a bonus.',
  },
  {
    targetId: 'goals',
    icon: faListCheck,
    title: 'Daily Goals',
    desc: () => 'Chores and habits show up here. Check them off as they get done.',
  },
  {
    targetId: 'stats',
    icon: faTrophy,
    title: 'Stats & Streaks',
    desc: () => 'See rank, streaks, and progress at a glance.',
  },
  {
    targetId: 'store',
    icon: faGift,
    title: 'The Store',
    desc: () => 'Points trade in for rewards here — you approve every request.',
  },
  {
    targetId: 'games',
    icon: faGamepad,
    title: 'Daily Games',
    desc: () => 'A few quick games for a small bonus each day.',
  },
  {
    targetId: 'account-menu',
    icon: faBars,
    title: 'Your Family Code',
    desc: (code) => (code
      ? `Your family's code is ${code} — find it here anytime to add another device.`
      : 'Find your family code here anytime to add another device.'),
  },
];

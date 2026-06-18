import type { IconKey } from './icons';

export interface Food {
  id: string;
  emoji: string;   // legacy fallback
  icon: IconKey;   // registered icon key (see data/icons.ts)
  label: string;
}

export const FOODS: Food[] = [
  { id: 'fruit', emoji: '🍎', icon: 'appleWhole', label: 'Fruit' },
  { id: 'veggie', emoji: '🥦', icon: 'carrot', label: 'Veggie' },
  { id: 'protein', emoji: '🍗', icon: 'drumstickBite', label: 'Protein' },
  { id: 'dairy', emoji: '🥛', icon: 'glassWater', label: 'Dairy' },
  { id: 'grain', emoji: '🍞', icon: 'breadSlice', label: 'Grain' },
];

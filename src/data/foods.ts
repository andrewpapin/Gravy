export interface Food {
  id: string;
  emoji: string;
  label: string;
}

export const FOODS: Food[] = [
  { id: 'fruit', emoji: '🍎', label: 'Fruit' },
  { id: 'veggie', emoji: '🥦', label: 'Veggie' },
  { id: 'protein', emoji: '🍗', label: 'Protein' },
  { id: 'dairy', emoji: '🥛', label: 'Dairy' },
  { id: 'grain', emoji: '🍞', label: 'Grain' },
];

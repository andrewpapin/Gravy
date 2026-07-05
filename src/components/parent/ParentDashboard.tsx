import { useEffect, useState } from 'react';

import { RootMenu, type RootDest } from './RootMenu';
import { GoalsPanel } from './GoalsPanel';
import { PointsPanel } from './PointsPanel';
import { StorePanel } from './StorePanel';
import { ArcadePanel } from './ArcadePanel';

type Root = 'menu' | RootDest;

const ROOT_TITLES: Record<Exclude<Root, 'menu'>, string> = {
  'daily-goals': 'Daily Goals',
  'food-tray': 'Food Tray Goals',
  'bonus-points': 'Bonus Points',
  store: 'Store',
  arcade: 'Arcade',
};

interface ParentDashboardProps {
  onHeaderChange: (header: { title: string; onBack?: () => void }) => void;
}

export function ParentDashboard({ onHeaderChange }: ParentDashboardProps) {
  const [root, setRoot] = useState<Root>('menu');

  const goToRoot = () => setRoot('menu');

  useEffect(() => {
    if (root === 'menu') {
      onHeaderChange({ title: 'Game Settings' });
    } else {
      onHeaderChange({ title: ROOT_TITLES[root], onBack: goToRoot });
    }
  }, [root, onHeaderChange]);

  if (root === 'menu') {
    return <RootMenu onNavigate={setRoot} />;
  }
  if (root === 'daily-goals') return <GoalsPanel filter="daily" />;
  if (root === 'food-tray') return <PointsPanel />;
  if (root === 'bonus-points') return <GoalsPanel filter="bonus" />;
  if (root === 'store') return <StorePanel />;
  return <ArcadePanel />;
}

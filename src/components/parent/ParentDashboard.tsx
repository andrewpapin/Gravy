import { useEffect, useState } from 'react';

import { RootMenu, type RootDest } from './RootMenu';
import { GoalsStorePanel } from './GoalsStorePanel';
import { ArcadePanel } from './ArcadePanel';

type Root = 'menu' | RootDest;

const ROOT_TITLES: Record<Exclude<Root, 'menu'>, string> = {
  'goals-store': 'Goals & Store',
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
  if (root === 'goals-store') return <GoalsStorePanel />;
  return <ArcadePanel />;
}

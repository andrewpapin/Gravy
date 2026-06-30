import { useEffect, useState } from 'react';

import { RootMenu, type RootDest } from './RootMenu';
import { GoalsPanel } from './GoalsPanel';
import { StorePanel } from './StorePanel';
import { BadgesPanel } from './BadgesPanel';

type Root = 'menu' | RootDest;

const ROOT_TITLES: Record<Exclude<Root, 'menu'>, string> = {
  goals: 'Goals',
  store: 'Store',
  badges: 'Badges',
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
  if (root === 'goals') return <GoalsPanel />;
  if (root === 'store') return <StorePanel />;
  return <BadgesPanel />;
}

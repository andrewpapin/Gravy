import { useEffect, useState } from 'react';

import { useGravy } from '../../state/GravyContext';
import { RootMenu, type RootDest } from './RootMenu';
import { ApprovalsPanel } from './ApprovalsPanel';
import { GoalsPanel } from './GoalsPanel';
import { CalendarPanel } from './CalendarPanel';
import { StorePanel } from './StorePanel';
import { BadgesPanel } from './BadgesPanel';
import { SettingsPanel } from './SettingsPanel';

type Root = 'menu' | RootDest;

const ROOT_TITLES: Record<Exclude<Root, 'menu'>, string> = {
  approvals: 'Approvals',
  goals: 'Goals',
  calendar: 'Calendar',
  store: 'Store',
  badges: 'Badges',
  settings: 'Settings',
};

interface ParentDashboardProps {
  onHeaderChange: (header: { title: string; onBack?: () => void }) => void;
}

export function ParentDashboard({ onHeaderChange }: ParentDashboardProps) {
  const { state } = useGravy();
  const [root, setRoot] = useState<Root>('menu');
  const pendingCount = state.pendingRewards.length;

  const goToRoot = () => setRoot('menu');

  useEffect(() => {
    if (root === 'menu') {
      onHeaderChange({ title: 'Grown-Up Mode' });
    } else {
      onHeaderChange({ title: ROOT_TITLES[root], onBack: goToRoot });
    }
  }, [root, onHeaderChange]);

  if (root === 'menu') {
    return <RootMenu pendingCount={pendingCount} onNavigate={setRoot} />;
  }
  if (root === 'approvals') return <ApprovalsPanel />;
  if (root === 'goals') return <GoalsPanel />;
  if (root === 'calendar') return <CalendarPanel onHeaderChange={onHeaderChange} goToRoot={goToRoot} />;
  if (root === 'store') return <StorePanel />;
  if (root === 'badges') return <BadgesPanel />;
  return <SettingsPanel />;
}

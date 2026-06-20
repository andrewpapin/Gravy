import { useEffect, useState } from 'react';

import { useGravy } from '../../state/GravyContext';
import { RootMenu, type RootDest } from './RootMenu';
import { ApprovalsPanel } from './ApprovalsPanel';
import { GoalsPanel } from './GoalsPanel';
import { StorePanel } from './StorePanel';
import { BadgesPanel } from './BadgesPanel';
import { SettingsPanel, type SettingsSub } from './SettingsPanel';

type Root = 'menu' | RootDest;

const ROOT_TITLES: Record<Exclude<Root, 'menu'>, string> = {
  approvals: 'Approvals',
  goals: 'Goals',
  store: 'Store',
  badges: 'Badges',
  settings: 'Settings',
};

const SETTINGS_TITLES: Record<SettingsSub, string> = {
  menu: 'Settings',
  points: 'Points & Rules',
  security: 'Security & PIN',
  sync: 'Cloud Sync',
  danger: 'Danger Zone',
};

interface ParentDashboardProps {
  onHeaderChange: (header: { title: string; onBack?: () => void }) => void;
}

export function ParentDashboard({ onHeaderChange }: ParentDashboardProps) {
  const { state } = useGravy();
  const [root, setRoot] = useState<Root>('menu');
  const [settingsSub, setSettingsSub] = useState<SettingsSub>('menu');
  const pendingCount = state.pendingRewards.length;

  const goToRoot = () => {
    setRoot('menu');
    setSettingsSub('menu');
  };

  useEffect(() => {
    if (root === 'menu') {
      onHeaderChange({ title: 'Grown-Up Mode' });
    } else if (root === 'settings' && settingsSub !== 'menu') {
      onHeaderChange({ title: SETTINGS_TITLES[settingsSub], onBack: () => setSettingsSub('menu') });
    } else {
      onHeaderChange({ title: ROOT_TITLES[root], onBack: goToRoot });
    }
  }, [root, settingsSub, onHeaderChange]);

  if (root === 'menu') {
    return <RootMenu pendingCount={pendingCount} onNavigate={setRoot} />;
  }
  if (root === 'approvals') return <ApprovalsPanel />;
  if (root === 'goals') return <GoalsPanel />;
  if (root === 'store') return <StorePanel />;
  if (root === 'badges') return <BadgesPanel />;
  return <SettingsPanel sub={settingsSub} onNavigate={setSettingsSub} />;
}

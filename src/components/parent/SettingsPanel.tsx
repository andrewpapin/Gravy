import { useEffect, useState } from 'react';

import { SettingsMenu, type SettingsDest } from './SettingsMenu';
import { TimezonePanel } from './TimezonePanel';
import { AccountPanel } from './AccountPanel';
import { SecurityPanel } from './SecurityPanel';
import { SyncPanel } from './SyncPanel';
import { DangerZonePanel } from './DangerZonePanel';

type Root = 'menu' | SettingsDest;

const ROOT_TITLES: Record<Exclude<Root, 'menu'>, string> = {
  timezone: 'Time Zone',
  account: 'Parent Account',
  security: 'PIN & Recovery',
  sync: 'Cloud Sync',
  reset: 'Reset',
};

interface SettingsPanelProps {
  onHeaderChange: (header: { title: string; onBack?: () => void }) => void;
}

export function SettingsPanel({ onHeaderChange }: SettingsPanelProps) {
  const [root, setRoot] = useState<Root>('menu');

  const goToRoot = () => setRoot('menu');

  useEffect(() => {
    if (root === 'menu') {
      onHeaderChange({ title: 'Advanced Settings' });
    } else {
      onHeaderChange({ title: ROOT_TITLES[root], onBack: goToRoot });
    }
  }, [root, onHeaderChange]);

  if (root === 'menu') {
    return <SettingsMenu onNavigate={setRoot} />;
  }
  if (root === 'timezone') return <TimezonePanel />;
  if (root === 'account') return <AccountPanel />;
  if (root === 'security') return <SecurityPanel />;
  if (root === 'sync') return <SyncPanel />;
  return <DangerZonePanel />;
}

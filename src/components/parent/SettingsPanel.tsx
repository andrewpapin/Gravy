import { useEffect, useState } from 'react';

import { SettingsMenu, type SettingsDest } from './SettingsMenu';
import { TimezonePanel } from './TimezonePanel';
import { AccountPanel } from './AccountPanel';
import { SyncPanel } from './SyncPanel';
import { LogPanel } from './LogPanel';
import { WeightedPointsPanel } from './WeightedPointsPanel';
import { DangerZonePanel } from './DangerZonePanel';

type Root = 'menu' | SettingsDest;

const ROOT_TITLES: Record<Exclude<Root, 'menu'>, string> = {
  timezone: 'Time Zone',
  account: 'Parent Account',
  sync: 'Family Code',
  log: 'Log',
  weighting: 'Dynamic Points',
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
  if (root === 'sync') return <SyncPanel />;
  if (root === 'log') return <LogPanel />;
  if (root === 'weighting') return <WeightedPointsPanel />;
  return <DangerZonePanel />;
}

import { TimezonePanel } from './TimezonePanel';
import { AccountPanel } from './AccountPanel';
import { SecurityPanel } from './SecurityPanel';
import { SyncPanel } from './SyncPanel';
import { DangerZonePanel } from './DangerZonePanel';

export function SettingsPanel() {
  return (
    <div>
      <TimezonePanel />
      <AccountPanel />
      <SecurityPanel />
      <SyncPanel />
      <DangerZonePanel />
    </div>
  );
}

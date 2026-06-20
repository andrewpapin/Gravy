import { SecurityPanel } from './SecurityPanel';
import { SyncPanel } from './SyncPanel';
import { DangerZonePanel } from './DangerZonePanel';

export function SettingsPanel() {
  return (
    <div>
      <SecurityPanel />
      <SyncPanel />
      <DangerZonePanel />
    </div>
  );
}

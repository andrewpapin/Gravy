import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faLock, faCloud, faTriangleExclamation, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';
import { PointsPanel } from './PointsPanel';
import { SecurityPanel } from './SecurityPanel';
import { SyncPanel } from './SyncPanel';
import { DangerZonePanel } from './DangerZonePanel';

export type SettingsSub = 'menu' | 'points' | 'security' | 'sync' | 'danger';

interface SettingsPanelProps {
  sub: SettingsSub;
  onNavigate: (sub: SettingsSub) => void;
}

export function SettingsPanel({ sub, onNavigate }: SettingsPanelProps) {
  if (sub === 'points') return <PointsPanel />;
  if (sub === 'security') return <SecurityPanel />;
  if (sub === 'sync') return <SyncPanel />;
  if (sub === 'danger') return <DangerZonePanel />;
  return <SettingsMenu onNavigate={onNavigate} />;
}

function SettingsMenu({ onNavigate }: { onNavigate: (sub: SettingsSub) => void }) {
  const { householdCode, syncStatus } = useGravy();
  const syncSub = householdCode
    ? syncStatus === 'syncing'
      ? 'Syncing…'
      : syncStatus === 'error'
        ? 'Sync error — tap to check'
        : `Synced — code ${householdCode}`
    : 'Not connected — sync across phones';

  return (
    <div>
      <button className="menu-card" onClick={() => onNavigate('points')} type="button">
        <span className="menu-card-icon"><FontAwesomeIcon icon={faCoins} /></span>
        <div className="menu-card-body">
          <div className="menu-card-title">Points & Rules</div>
          <div className="menu-card-sub">How many points each action earns</div>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="menu-card-chevron" />
      </button>
      <button className="menu-card" onClick={() => onNavigate('security')} type="button">
        <span className="menu-card-icon"><FontAwesomeIcon icon={faLock} /></span>
        <div className="menu-card-body">
          <div className="menu-card-title">Security & PIN</div>
          <div className="menu-card-sub">Change the PIN and recovery question</div>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="menu-card-chevron" />
      </button>
      <button className="menu-card" onClick={() => onNavigate('sync')} type="button">
        <span className="menu-card-icon"><FontAwesomeIcon icon={faCloud} /></span>
        <div className="menu-card-body">
          <div className="menu-card-title">Cloud Sync</div>
          <div className="menu-card-sub">{syncSub}</div>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="menu-card-chevron" />
      </button>
      <button className="menu-card menu-card--danger" onClick={() => onNavigate('danger')} type="button">
        <span className="menu-card-icon"><FontAwesomeIcon icon={faTriangleExclamation} /></span>
        <div className="menu-card-body">
          <div className="menu-card-title">Danger Zone</div>
          <div className="menu-card-sub">Reset today's progress or everything</div>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="menu-card-chevron" />
      </button>
    </div>
  );
}

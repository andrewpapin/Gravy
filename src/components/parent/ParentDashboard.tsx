import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faListCheck,
  faCartShopping,
  faMedal,
  faGear,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';

import { ApprovalsPanel } from './ApprovalsPanel';
import { GoalsPanel } from './GoalsPanel';
import { StorePanel } from './StorePanel';
import { BadgesPanel } from './BadgesPanel';
import { SettingsPanel } from './SettingsPanel';

type ParentTab = 'approvals' | 'goals' | 'store' | 'badges' | 'settings';

const TABS: { id: ParentTab; label: string; icon: IconDefinition }[] = [
  { id: 'approvals', label: 'Approvals', icon: faCircleCheck },
  { id: 'goals', label: 'Goals', icon: faListCheck },
  { id: 'store', label: 'Store', icon: faCartShopping },
  { id: 'badges', label: 'Badges', icon: faMedal },
  { id: 'settings', label: 'Settings', icon: faGear },
];

export function ParentDashboard() {
  const [tab, setTab] = useState<ParentTab>('approvals');

  return (
    <>
      <div className="parent-tabs" role="tablist" aria-label="Parent dashboard">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`parent-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <FontAwesomeIcon icon={t.icon} /> {t.label}
          </button>
        ))}
      </div>
      <div>
        {tab === 'approvals' && <ApprovalsPanel />}
        {tab === 'goals' && <GoalsPanel />}
        {tab === 'store' && <StorePanel />}
        {tab === 'badges' && <BadgesPanel />}
        {tab === 'settings' && <SettingsPanel />}
      </div>
    </>
  );
}

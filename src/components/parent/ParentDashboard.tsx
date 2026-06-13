import { useState } from 'react';
import { ApprovalsPanel } from './ApprovalsPanel';
import { ChoresPanel } from './ChoresPanel';
import { StorePanel } from './StorePanel';
import { BadgesPanel } from './BadgesPanel';
import { SettingsPanel } from './SettingsPanel';

type ParentTab = 'approvals' | 'chores' | 'store' | 'badges' | 'settings';

const TABS: { id: ParentTab; label: string }[] = [
  { id: 'approvals', label: '✅ Approvals' },
  { id: 'chores', label: '🧹 Chores' },
  { id: 'store', label: '🛒 Store' },
  { id: 'badges', label: '🏅 Badges' },
  { id: 'settings', label: '⚙️ Settings' },
];

interface ParentDashboardProps {
  onExit: () => void;
}

export function ParentDashboard({ onExit }: ParentDashboardProps) {
  const [tab, setTab] = useState<ParentTab>('approvals');

  return (
    <div className="parent-screen-inner active">
      <div className="parent-topbar">
        <div className="parent-topbar-title">⚙️ Parent Dashboard</div>
        <button
          className="btn btn-sm"
          style={{ background: '#2A2000', color: 'var(--yellow)', padding: '6px 12px', fontSize: '0.75rem' }}
          onClick={onExit}
        >
          ← Exit
        </button>
      </div>
      <div className="parent-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`parent-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="scroll-area" style={{ background: '#0E0E0E' }}>
        {tab === 'approvals' && <ApprovalsPanel />}
        {tab === 'chores' && <ChoresPanel />}
        {tab === 'store' && <StorePanel />}
        {tab === 'badges' && <BadgesPanel />}
        {tab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}

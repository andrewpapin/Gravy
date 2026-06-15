import { useState } from 'react';
import { GrubClubProvider } from './state/GrubClubContext';
import { HomeScreen } from './components/HomeScreen';
import { StoreScreen } from './components/StoreScreen';
import { BadgesScreen } from './components/BadgesScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { BottomNav, type Tab } from './components/BottomNav';
import { PinScreen } from './components/PinScreen';
import { ParentDashboard } from './components/parent/ParentDashboard';
import { ToastContainer } from './components/ToastContainer';
import { Celebration } from './components/Celebration';
import { Confetti } from './components/Confetti';
import { BadgePopup } from './components/BadgePopup';
import { SyncGateModal } from './components/SyncGateModal';

type View = 'kid' | 'pin' | 'parent';

function AppShell() {
  const [view, setView] = useState<View>('kid');
  const [tab, setTab] = useState<Tab>('home');
  const [activeBadge, setActiveBadge] = useState<string | null>(null);

  return (
    <>
      {view === 'kid' && (
        <div id="kidApp">
          {tab === 'home' && <HomeScreen onEnterParent={() => setView('pin')} onOpenCalendar={() => setTab('calendar')} />}
          {tab === 'store' && <StoreScreen onEnterParent={() => setView('pin')} />}
          {tab === 'badges' && <BadgesScreen onShowBadge={setActiveBadge} onEnterParent={() => setView('pin')} />}
          {tab === 'calendar' && <CalendarScreen onEnterParent={() => setView('pin')} />}
          <BottomNav active={tab} onChange={setTab} onEnterParent={() => setView('pin')} />
        </div>
      )}

      {view === 'pin' && <PinScreen onSuccess={() => setView('parent')} onBack={() => setView('kid')} />}

      {view === 'parent' && <ParentDashboard onExit={() => setView('kid')} />}

      <BadgePopup badgeId={activeBadge} onClose={() => setActiveBadge(null)} />
      <Celebration />
      <Confetti />
      <ToastContainer />
      <SyncGateModal />
    </>
  );
}

function App() {
  return (
    <GrubClubProvider>
      <AppShell />
    </GrubClubProvider>
  );
}

export default App;

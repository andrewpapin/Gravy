import { Component, useState, type ReactNode } from 'react';
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

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 16, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem' }}>😵</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Something went wrong</div>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload app</button>
        </div>
      );
    }
    return this.props.children;
  }
}

type View = 'kid' | 'pin' | 'parent';

function AppShell() {
  const [view, setView] = useState<View>('kid');
  const [tab, setTab] = useState<Tab>('home');
  const [activeBadge, setActiveBadge] = useState<string | null>(null);

  return (
    <>
      {view === 'kid' && (
        <div id="kidApp">
          {tab === 'home' && <HomeScreen onOpenCalendar={() => setTab('calendar')} />}
          {tab === 'store' && <StoreScreen />}
          {tab === 'badges' && <BadgesScreen onShowBadge={setActiveBadge} />}
          {tab === 'calendar' && <CalendarScreen />}
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
    <ErrorBoundary>
      <GrubClubProvider>
        <AppShell />
      </GrubClubProvider>
    </ErrorBoundary>
  );
}

export default App;

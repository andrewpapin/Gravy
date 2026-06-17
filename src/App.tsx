import { useState, Component, type ReactNode } from 'react';
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
import { todayStr } from './state/defaultState';

type View = 'kid' | 'pin' | 'parent';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 16, padding: 32, fontFamily: 'Nunito, system-ui, sans-serif' }}>
          <div style={{ fontSize: '3rem' }}>😵</div>
          <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#2F3E46' }}>Something went wrong</div>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#F6BD60', border: '3px solid #2F3E46', borderRadius: 14, padding: '12px 24px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '4px 4px 0 #2F3E46' }}
          >
            Tap to reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppShell() {
  const [view, setView] = useState<View>('kid');
  const [tab, setTab] = useState<Tab>('home');
  const [activeBadge, setActiveBadge] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());

  return (
    <>
      {view === 'kid' && (
        <div id="kidApp">
          {tab === 'home' && (
            <HomeScreen
              onEnterParent={() => setView('pin')}
              onOpenCalendar={() => setCalendarOpen(true)}
              onOpenStore={() => setTab('store')}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}
          {tab === 'store' && <StoreScreen onEnterParent={() => setView('pin')} />}
          {tab === 'badges' && (
            <BadgesScreen
              onShowBadge={setActiveBadge}
              onEnterParent={() => setView('pin')}
              onOpenStore={() => setTab('store')}
            />
          )}
          <BottomNav active={tab} onChange={setTab} onEnterParent={() => setView('pin')} />
          <CalendarScreen
            open={calendarOpen}
            onClose={() => setCalendarOpen(false)}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
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

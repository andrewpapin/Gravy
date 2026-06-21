import { useState, Component, type ReactNode } from 'react';
import { GravyProvider } from './state/GravyContext';
import { HomeScreen } from './components/HomeScreen';
import { StoreScreen } from './components/StoreScreen';
import { BadgesScreen } from './components/BadgesScreen';
import { GrownUpsDrawer } from './components/parent/GrownUpsDrawer';
import { AccountMenu } from './components/AccountMenu';
import { SettingsScreen } from './components/SettingsScreen';
import { ToastContainer } from './components/ToastContainer';
import { Celebration } from './components/Celebration';
import { Confetti } from './components/Confetti';
import { BadgePopup } from './components/BadgePopup';
import { SyncGateModal } from './components/SyncGateModal';
import { Onboarding, ONBOARDING_DONE_KEY } from './components/Onboarding';
import { STORAGE_KEY } from './state/defaultState';

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
  const [activeBadge, setActiveBadge] = useState<string | null>(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [grownUpsOpen, setGrownUpsOpen] = useState(false);
  // Returning users who already had saved progress before this feature shipped
  // shouldn't suddenly see the walkthrough — only brand-new installs get it.
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem(ONBOARDING_DONE_KEY) === 'true' || localStorage.getItem(STORAGE_KEY) !== null,
  );

  return (
    <>
      <div id="kidApp">
        <HomeScreen
          onOpenAvatarMenu={() => setAccountMenuOpen(true)}
          onOpenBadges={() => setBadgesOpen(true)}
        />
        <StoreScreen open={storeOpen} onClose={() => setStoreOpen(false)} />
        <BadgesScreen
          open={badgesOpen}
          onClose={() => setBadgesOpen(false)}
          onShowBadge={setActiveBadge}
        />
        <AccountMenu
          open={accountMenuOpen}
          onClose={() => setAccountMenuOpen(false)}
          onOpenStore={() => { setAccountMenuOpen(false); setStoreOpen(true); }}
          onOpenSettings={() => { setAccountMenuOpen(false); setSettingsOpen(true); }}
          onOpenGrownUps={() => { setAccountMenuOpen(false); setGrownUpsOpen(true); }}
        />
        <SettingsScreen open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <GrownUpsDrawer open={grownUpsOpen} onClose={() => setGrownUpsOpen(false)} />
      </div>

      <BadgePopup badgeId={activeBadge} onClose={() => setActiveBadge(null)} />
      <Celebration />
      <Confetti />
      <ToastContainer />
      {onboarded ? <SyncGateModal /> : <Onboarding onComplete={() => setOnboarded(true)} />}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <GravyProvider>
        <AppShell />
      </GravyProvider>
    </ErrorBoundary>
  );
}

export default App;

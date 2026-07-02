import { useState, Component, lazy, Suspense, type ReactNode } from 'react';
import { GravyProvider } from './state/GravyContext';
import { HomeScreen } from './components/HomeScreen';
import { GrownUpsDrawer } from './components/parent/GrownUpsDrawer';
import { AccountMenu } from './components/AccountMenu';
import { ToastContainer } from './components/ToastContainer';
import { UpdatePrompt } from './components/UpdatePrompt';
import { Celebration } from './components/Celebration';
import { Confetti } from './components/Confetti';
import { BadgePopup } from './components/BadgePopup';
import { STORAGE_KEY, ONBOARDING_DONE_KEY } from './state/defaultState';
import { safeGetItem } from './state/storage';

// These are all overlays/modals that aren't needed for the initial kid-facing paint (closed
// by default, or — for Onboarding/SyncGateModal — only one of the two ever mounts depending
// on first-run state). Loading them on demand keeps their weight out of the main bundle.
const StoreScreen = lazy(() => import('./components/StoreScreen').then((m) => ({ default: m.StoreScreen })));
const BadgesScreen = lazy(() => import('./components/BadgesScreen').then((m) => ({ default: m.BadgesScreen })));
const GamesScreen = lazy(() => import('./components/GamesScreen').then((m) => ({ default: m.GamesScreen })));
const RankScreen = lazy(() => import('./components/RankScreen').then((m) => ({ default: m.RankScreen })));
const ProfileSwitcher = lazy(() => import('./components/ProfileSwitcher').then((m) => ({ default: m.ProfileSwitcher })));
const ProfilesManager = lazy(() => import('./components/ProfilesManager').then((m) => ({ default: m.ProfilesManager })));
const AdvancedSettingsDrawer = lazy(() => import('./components/parent/AdvancedSettingsDrawer').then((m) => ({ default: m.AdvancedSettingsDrawer })));
const LogDrawer = lazy(() => import('./components/parent/LogDrawer').then((m) => ({ default: m.LogDrawer })));
const CalendarDrawer = lazy(() => import('./components/parent/CalendarDrawer').then((m) => ({ default: m.CalendarDrawer })));
const ApprovalsDrawer = lazy(() => import('./components/parent/ApprovalsDrawer').then((m) => ({ default: m.ApprovalsDrawer })));
const SyncGateModal = lazy(() => import('./components/SyncGateModal').then((m) => ({ default: m.SyncGateModal })));
const Onboarding = lazy(() => import('./components/Onboarding').then((m) => ({ default: m.Onboarding })));

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
            style={{ background: '#F6BD60', border: '2px solid #2F3E46', borderRadius: 14, padding: '12px 24px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '4px 4px 0 #2F3E46' }}
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
  const [gamesOpen, setGamesOpen] = useState(false);
  const [rankOpen, setRankOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [grownUpsOpen, setGrownUpsOpen] = useState(false);
  const [switchProfileOpen, setSwitchProfileOpen] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  // Returning users who already had saved progress before this feature shipped
  // shouldn't suddenly see the walkthrough — only brand-new installs get it.
  const [onboarded, setOnboarded] = useState(
    () => safeGetItem(ONBOARDING_DONE_KEY) === 'true' || safeGetItem(STORAGE_KEY) !== null,
  );

  return (
    <>
      <div id="kidApp">
        <HomeScreen
          onOpenAccountMenu={() => setAccountMenuOpen(true)}
          onOpenApprovals={() => setApprovalsOpen(true)}
          onOpenStore={() => setStoreOpen(true)}
          onOpenBadges={() => setBadgesOpen(true)}
          onOpenGames={() => setGamesOpen(true)}
          onOpenRank={() => setRankOpen(true)}
        />
        <Suspense fallback={null}>
          <StoreScreen open={storeOpen} onClose={() => setStoreOpen(false)} />
        </Suspense>
        <Suspense fallback={null}>
          <BadgesScreen
            open={badgesOpen}
            onClose={() => setBadgesOpen(false)}
            onShowBadge={setActiveBadge}
          />
        </Suspense>
        <Suspense fallback={null}>
          <GamesScreen open={gamesOpen} onClose={() => setGamesOpen(false)} />
        </Suspense>
        <Suspense fallback={null}>
          <RankScreen open={rankOpen} onClose={() => setRankOpen(false)} />
        </Suspense>
        <AccountMenu
          open={accountMenuOpen}
          onClose={() => setAccountMenuOpen(false)}
          onOpenGrownUps={() => { setAccountMenuOpen(false); setGrownUpsOpen(true); }}
          onOpenSwitchProfile={() => { setAccountMenuOpen(false); setSwitchProfileOpen(true); }}
          onOpenProfiles={() => { setAccountMenuOpen(false); setProfilesOpen(true); }}
          onOpenSettings={() => { setAccountMenuOpen(false); setSettingsOpen(true); }}
          onOpenLog={() => { setAccountMenuOpen(false); setLogOpen(true); }}
          onOpenCalendar={() => { setAccountMenuOpen(false); setCalendarOpen(true); }}
        />
        <GrownUpsDrawer
          open={grownUpsOpen}
          onClose={() => setGrownUpsOpen(false)}
          onBack={() => { setGrownUpsOpen(false); setAccountMenuOpen(true); }}
        />
        <Suspense fallback={null}>
          <ProfileSwitcher
            open={switchProfileOpen}
            onClose={() => setSwitchProfileOpen(false)}
            onBack={() => { setSwitchProfileOpen(false); setAccountMenuOpen(true); }}
          />
        </Suspense>
        <Suspense fallback={null}>
          <ProfilesManager
            open={profilesOpen}
            onClose={() => setProfilesOpen(false)}
            onBack={() => { setProfilesOpen(false); setAccountMenuOpen(true); }}
          />
        </Suspense>
        <Suspense fallback={null}>
          <AdvancedSettingsDrawer
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            onBack={() => { setSettingsOpen(false); setAccountMenuOpen(true); }}
          />
        </Suspense>
        <Suspense fallback={null}>
          <LogDrawer
            open={logOpen}
            onClose={() => setLogOpen(false)}
            onBack={() => { setLogOpen(false); setAccountMenuOpen(true); }}
          />
        </Suspense>
        <Suspense fallback={null}>
          <CalendarDrawer
            open={calendarOpen}
            onClose={() => setCalendarOpen(false)}
            onBack={() => { setCalendarOpen(false); setAccountMenuOpen(true); }}
          />
        </Suspense>
        <Suspense fallback={null}>
          <ApprovalsDrawer
            open={approvalsOpen}
            onClose={() => setApprovalsOpen(false)}
          />
        </Suspense>
      </div>

      <BadgePopup badgeId={activeBadge} onClose={() => setActiveBadge(null)} />
      <Celebration />
      <Confetti />
      <ToastContainer />
      <UpdatePrompt />
      <Suspense fallback={null}>
        {onboarded ? <SyncGateModal /> : <Onboarding onComplete={() => setOnboarded(true)} />}
      </Suspense>
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

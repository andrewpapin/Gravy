import { useState, Component, lazy, Suspense, type ReactNode } from 'react';
import { GravyProvider, useGravy } from './state/GravyContext';
import { HomeScreen } from './components/HomeScreen';
import { GrownUpsDrawer } from './components/parent/GrownUpsDrawer';
import { AccountMenu } from './components/AccountMenu';
import { StorageErrorBanner } from './components/StorageErrorBanner';
import { UpdatePrompt } from './components/UpdatePrompt';
import { ReleaseNotesDrawer } from './components/ReleaseNotesDrawer';
import { Celebration } from './components/Celebration';
import { Confetti } from './components/Confetti';
import { STORAGE_KEY, ONBOARDING_DONE_KEY, HOME_TOUR_DONE_KEY } from './state/defaultState';
import { safeGetItem } from './state/storage';

// These are all overlays/modals that aren't needed for the initial kid-facing paint (closed
// by default, or — for Onboarding/SyncGateModal — only one of the two ever mounts depending
// on first-run state). Loading them on demand keeps their weight out of the main bundle.
const StoreScreen = lazy(() => import('./components/StoreScreen').then((m) => ({ default: m.StoreScreen })));
const GamesScreen = lazy(() => import('./components/GamesScreen').then((m) => ({ default: m.GamesScreen })));
const RankScreen = lazy(() => import('./components/RankScreen').then((m) => ({ default: m.RankScreen })));
const ProfileSwitcher = lazy(() => import('./components/ProfileSwitcher').then((m) => ({ default: m.ProfileSwitcher })));
const ProfilesManager = lazy(() => import('./components/ProfilesManager').then((m) => ({ default: m.ProfilesManager })));
const AdvancedSettingsDrawer = lazy(() => import('./components/parent/AdvancedSettingsDrawer').then((m) => ({ default: m.AdvancedSettingsDrawer })));
const CalendarDrawer = lazy(() => import('./components/parent/CalendarDrawer').then((m) => ({ default: m.CalendarDrawer })));
const ReleaseNotesHistoryDrawer = lazy(() => import('./components/ReleaseNotesHistoryDrawer').then((m) => ({ default: m.ReleaseNotesHistoryDrawer })));
const ApprovalsDrawer = lazy(() => import('./components/parent/ApprovalsDrawer').then((m) => ({ default: m.ApprovalsDrawer })));
const SyncGateModal = lazy(() => import('./components/SyncGateModal').then((m) => ({ default: m.SyncGateModal })));
const Onboarding = lazy(() => import('./components/Onboarding').then((m) => ({ default: m.Onboarding })));
const FirstKidPrompt = lazy(() => import('./components/tour/FirstKidPrompt').then((m) => ({ default: m.FirstKidPrompt })));
const HomeTour = lazy(() => import('./components/tour/HomeTour').then((m) => ({ default: m.HomeTour })));
const ResetPasswordScreen = lazy(() => import('./components/ResetPasswordScreen').then((m) => ({ default: m.ResetPasswordScreen })));

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
  const { passwordRecovery } = useGravy();
  const [storeOpen, setStoreOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [rankOpen, setRankOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [grownUpsOpen, setGrownUpsOpen] = useState(false);
  const [switchProfileOpen, setSwitchProfileOpen] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [releaseNotesHistoryOpen, setReleaseNotesHistoryOpen] = useState(false);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  // Returning users who already had saved progress before this feature shipped
  // shouldn't suddenly see onboarding or the first-run tour — only brand-new installs get either.
  const alreadyHadProgress = safeGetItem(ONBOARDING_DONE_KEY) === 'true' || safeGetItem(STORAGE_KEY) !== null;
  const [onboarded, setOnboarded] = useState(() => alreadyHadProgress);
  // Set from Onboarding's onComplete — only the "New Family" path needs the kid-name prompt
  // before the tour; joining an existing household means its kid profiles already synced in.
  const [needsFirstKid, setNeedsFirstKid] = useState(false);
  const [tourDone, setTourDone] = useState(
    () => alreadyHadProgress || safeGetItem(HOME_TOUR_DONE_KEY) === 'true',
  );

  return (
    <>
      <div id="kidApp">
        <HomeScreen
          onOpenAccountMenu={() => setAccountMenuOpen(true)}
          onOpenApprovals={() => setApprovalsOpen(true)}
          onOpenStore={() => setStoreOpen(true)}
          onOpenGames={() => setGamesOpen(true)}
          onOpenRank={() => setRankOpen(true)}
        />
        <Suspense fallback={null}>
          <StoreScreen open={storeOpen} onClose={() => setStoreOpen(false)} />
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
          onOpenCalendar={() => { setAccountMenuOpen(false); setCalendarOpen(true); }}
          onOpenReleaseNotes={() => { setAccountMenuOpen(false); setReleaseNotesHistoryOpen(true); }}
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
          <CalendarDrawer
            open={calendarOpen}
            onClose={() => setCalendarOpen(false)}
            onBack={() => { setCalendarOpen(false); setAccountMenuOpen(true); }}
          />
        </Suspense>
        <Suspense fallback={null}>
          <ReleaseNotesHistoryDrawer
            open={releaseNotesHistoryOpen}
            onClose={() => setReleaseNotesHistoryOpen(false)}
            onBack={() => { setReleaseNotesHistoryOpen(false); setAccountMenuOpen(true); }}
          />
        </Suspense>
        <Suspense fallback={null}>
          <ApprovalsDrawer
            open={approvalsOpen}
            onClose={() => setApprovalsOpen(false)}
          />
        </Suspense>
      </div>

      <Celebration />
      <Confetti />
      <StorageErrorBanner />
      <UpdatePrompt />
      <Suspense fallback={null}>
        {onboarded ? (
          <SyncGateModal />
        ) : (
          <Onboarding
            onComplete={({ isNewFamily }) => { setOnboarded(true); setNeedsFirstKid(isNewFamily); }}
          />
        )}
      </Suspense>
      {onboarded && needsFirstKid && (
        <Suspense fallback={null}>
          <FirstKidPrompt onDone={() => setNeedsFirstKid(false)} />
        </Suspense>
      )}
      {onboarded && !needsFirstKid && !tourDone && (
        <Suspense fallback={null}>
          <HomeTour onDone={() => setTourDone(true)} />
        </Suspense>
      )}
      {/* Rendered last so it stacks above the sync gate/onboarding/tour — release notes are
          dismissible and shouldn't get silently buried behind a mandatory-looking overlay. */}
      <ReleaseNotesDrawer />
      {/* Rendered after everything else so a password-reset link (which can land at any point —
          the app may already be mid-onboarding or showing release notes) always takes over. */}
      {passwordRecovery && (
        <Suspense fallback={null}>
          <ResetPasswordScreen />
        </Suspense>
      )}
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

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { useGravy } from '../../state/GravyContext';

// Reached only when grownUpUnlocked (signed in + household member) — see isGrownUpUnlocked in
// state/auth.ts — so authUser is always set here in practice. The sign-in form itself lives in
// SignInPrompt, rendered as a full page (FullPageOverlay) by whichever parent screen this button's
// sign-out re-locks (AccountMenu, ApprovalsDrawer, GrownUpsDrawer, ProfilesManager, ProfileSwitcher,
// AdvancedSettingsDrawer, CalendarDrawer all self-gate the same way). COPPA: an account is a parent
// identity only — never a child's name or data (that stays in-app after sign-in).
export function AccountPanel() {
  const { authUser, signOutAccount } = useGravy();
  if (!authUser) return null;

  return (
    <div>
      <div className="settings-row settings-row--col">
        <div>
          <div className="settings-label">
            <FontAwesomeIcon icon={faUser} /> Signed in
          </div>
          <div className="settings-sub">{authUser.email ?? 'Your account'}</div>
        </div>
        <button className="btn btn-primary btn-ghost" onClick={() => void signOutAccount()}>
          <FontAwesomeIcon icon={faRightFromBracket} /> Sign out
        </button>
      </div>
    </div>
  );
}

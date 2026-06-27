import { safeSessionGetItem, safeSessionRemoveItem, safeSessionSetItem } from './storage';

// Session-scoped (sessionStorage, not localStorage) so unlocking grown-up access doesn't
// persist once the browser tab/PWA window closes — reopening the app always starts locked.
//
// Epic 8 note: this PIN-gated unlock is a *per-device kid-screen lock*, deliberately decoupled
// from the parent account (Supabase Auth, src/state/auth.ts). Its job is keeping a kid out of
// the dashboard on a shared device — not authenticating a parent's identity, which is what an
// account does. The two are independent: a household can be signed in to an account and still
// be PIN-locked on this device, and vice-versa.
const UNLOCK_KEY = 'gravy_grownup_unlocked';

export function readGrownUpUnlocked(): boolean {
  return safeSessionGetItem(UNLOCK_KEY) === 'true';
}

export function writeGrownUpUnlocked(unlocked: boolean): void {
  if (unlocked) {
    safeSessionSetItem(UNLOCK_KEY, 'true');
  } else {
    safeSessionRemoveItem(UNLOCK_KEY);
  }
}

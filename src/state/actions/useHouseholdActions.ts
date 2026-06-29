import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { faCircleXmark, faCircleCheck, faEnvelope, faCloud, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import type { GravyRoot, GravyState, ProfileEntry } from '../types';
import { hydrateState, mirrorSharedFields } from '../defaultState';
import { appendAuditLog } from '../auditLog';
import type { LogActor } from '../actionLog';
import {
  createHousehold as createHouseholdRow,
  deleteHousehold as deleteHouseholdRow,
  fetchHousehold,
  generateHouseholdCode,
  isValidHouseholdCode,
  renameHousehold as renameHouseholdRow,
} from '../sync';
import { safeRemoveItem, safeSetItem } from '../storage';
import {
  type AuthUser,
  type HouseholdStatus,
  claimHousehold as claimHouseholdRpc,
  getHouseholdStatus,
  sendMagicLink,
  signInWithPassword,
  signOut as signOutSupabase,
  signUpWithPassword,
} from '../auth';
import { HOUSEHOLD_CODE_KEY, activeStateOf, buildMergedRoot, clone } from './shared';
import type { ShowToast, SyncStatus } from './types';

export interface HouseholdDeps {
  setState: Dispatch<SetStateAction<GravyState>>;
  setRoot: Dispatch<SetStateAction<GravyRoot>>;
  stateRef: MutableRefObject<GravyState>;
  rootRef: MutableRefObject<GravyRoot>;
  showToast: ShowToast;
  actorRef: MutableRefObject<LogActor | undefined>;
  setSyncStatus: Dispatch<SetStateAction<SyncStatus>>;
  setHouseholdCode: Dispatch<SetStateAction<string | null>>;
  lastSyncedRef: MutableRefObject<string | null>;
  pendingTimersRef: MutableRefObject<number[]>;
  householdCode: string | null;
  authUser: AuthUser | null;
  setHouseholdStatus: Dispatch<SetStateAction<HouseholdStatus | null>>;
}

// Cloud-sync household lifecycle (create/join/leave/delete/rename) and parent-account auth
// (sign up/in/out, magic link, claim). The realtime push/subscribe wiring lives in
// `../useHouseholdSync.ts`; these are the imperative one-shot actions the Sync/Account panels call.
export function useHouseholdActions(deps: HouseholdDeps) {
  const {
    setState, setRoot, stateRef, rootRef, showToast, actorRef, setSyncStatus,
    setHouseholdCode, lastSyncedRef, pendingTimersRef, householdCode, authUser, setHouseholdStatus,
  } = deps;

  const createHousehold = useCallback(async (customCode?: string) => {
    if (customCode) {
      const normalized = customCode.trim().toUpperCase();
      if (!isValidHouseholdCode(normalized)) {
        showToast(faCircleXmark, 'Code must be 6 letters/numbers (no 0, O, 1, or I)');
        return null;
      }
      setSyncStatus('syncing');
      try {
        const merged = buildMergedRoot(rootRef.current, stateRef.current);
        await createHouseholdRow(normalized, merged);
        lastSyncedRef.current = JSON.stringify(merged);
        safeSetItem(HOUSEHOLD_CODE_KEY, normalized);
        setHouseholdCode(normalized);
        setSyncStatus('idle');
        setState((prev) => { const next = clone(prev); appendAuditLog(next, actorRef.current, { type: 'syncEnabled', label: `Enabled cloud sync (code ${normalized})` }); return next; });
        showToast(faCloud, `Cloud sync enabled! Code: ${normalized}`);
        return normalized;
      } catch (err) {
        setSyncStatus('error');
        if ((err as { code?: string }).code === '23505') {
          showToast(faCircleXmark, 'That code is already taken — try another');
        } else {
          showToast(
            faCircleXmark,
            navigator.onLine ? 'Server error — please try again' : 'No internet connection — try again when back online',
          );
        }
        return null;
      }
    }
    setSyncStatus('syncing');
    // Codes are random, but on the off chance one already exists the insert hits the
    // primary-key constraint (Postgres 23505) — regenerate and retry a few times rather
    // than failing the whole sync setup.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateHouseholdCode();
      try {
        const merged = buildMergedRoot(rootRef.current, stateRef.current);
        await createHouseholdRow(code, merged);
        lastSyncedRef.current = JSON.stringify(merged);
        safeSetItem(HOUSEHOLD_CODE_KEY, code);
        setHouseholdCode(code);
        setSyncStatus('idle');
        setState((prev) => { const next = clone(prev); appendAuditLog(next, actorRef.current, { type: 'syncEnabled', label: `Enabled cloud sync (code ${code})` }); return next; });
        showToast(faCloud, `Cloud sync enabled! Code: ${code}`);
        return code;
      } catch (err) {
        if ((err as { code?: string }).code === '23505' && attempt < 4) continue;
        setSyncStatus('error');
        showToast(
          faCircleXmark,
          navigator.onLine ? 'Server error — please try again' : 'No internet connection — try again when back online',
        );
        return null;
      }
    }
    return null;
  }, [setState, stateRef, rootRef, showToast, actorRef, setSyncStatus, setHouseholdCode, lastSyncedRef]);

  const joinHousehold = useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase();
    setSyncStatus('syncing');
    try {
      const remoteRoot = await fetchHousehold(normalized);
      if (!remoteRoot) {
        setSyncStatus('error');
        showToast(faCircleXmark, 'Household code not found');
        return false;
      }
      const profiles: ProfileEntry[] = (remoteRoot.profiles || [])
        .filter((p) => p && p.state)
        .map((p) => ({ id: p.id, state: hydrateState(p.state) }));
      if (profiles.length === 0) {
        setSyncStatus('error');
        showToast(faCircleXmark, 'Household code not found');
        return false;
      }
      const finalRoot: GravyRoot = {
        version: 2,
        activeProfileId: profiles.some((p) => p.id === remoteRoot.activeProfileId)
          ? remoteRoot.activeProfileId
          : profiles[0].id,
        profiles,
      };
      mirrorSharedFields(finalRoot);
      lastSyncedRef.current = JSON.stringify(finalRoot);
      setRoot(finalRoot);
      setState(activeStateOf(finalRoot));
      safeSetItem(HOUSEHOLD_CODE_KEY, normalized);
      setHouseholdCode(normalized);
      setSyncStatus('idle');
      setState((prev) => { const next = clone(prev); appendAuditLog(next, actorRef.current, { type: 'syncJoined', label: `Joined household (code ${normalized})` }); return next; });
      showToast(faCloud, 'Joined household sync!');
      return true;
    } catch (err) {
      setSyncStatus('error');
      const message = (err as { message?: string }).message;
      if (message?.startsWith('Too many attempts')) {
        showToast(faCircleXmark, message);
      } else {
        showToast(
          faCircleXmark,
          navigator.onLine ? 'Server error — please try again' : 'No internet connection — try again when back online',
        );
      }
      return false;
    }
  }, [setState, setRoot, showToast, actorRef, setSyncStatus, setHouseholdCode, lastSyncedRef]);

  const leaveHousehold = useCallback(() => {
    // Cancel any deferred celebration/badge toasts queued just before disconnecting — they'd
    // otherwise still fire afterward, referencing a state snapshot from the now-disconnected sync.
    pendingTimersRef.current.forEach((t) => clearTimeout(t));
    pendingTimersRef.current = [];
    safeRemoveItem(HOUSEHOLD_CODE_KEY);
    setHouseholdCode(null);
    lastSyncedRef.current = null;
    setSyncStatus('idle');
    setState((prev) => { const next = clone(prev); appendAuditLog(next, actorRef.current, { type: 'syncDisabled', label: 'Turned off cloud sync (this device)' }); return next; });
    showToast(faCloud, 'Cloud sync turned off');
  }, [setState, showToast, actorRef, setSyncStatus, setHouseholdCode, lastSyncedRef, pendingTimersRef]);

  // Unlike leaveHousehold (which only disconnects this device), this deletes the household
  // row server-side — every other device synced to this code loses access to it too.
  const deleteHouseholdEverywhere = useCallback(async () => {
    if (!householdCode) return false;
    pendingTimersRef.current.forEach((t) => clearTimeout(t));
    pendingTimersRef.current = [];
    setSyncStatus('syncing');
    try {
      await deleteHouseholdRow(householdCode);
      safeRemoveItem(HOUSEHOLD_CODE_KEY);
      setHouseholdCode(null);
      lastSyncedRef.current = null;
      setSyncStatus('idle');
      setState((prev) => { const next = clone(prev); appendAuditLog(next, actorRef.current, { type: 'syncDeleted', label: 'Deleted household everywhere' }); return next; });
      showToast(faTrashCan, 'Household deleted everywhere');
      return true;
    } catch {
      setSyncStatus('error');
      showToast(
        faCircleXmark,
        navigator.onLine ? 'Server error — please try again' : 'No internet connection — try again when back online',
      );
      return false;
    }
  }, [householdCode, setState, showToast, actorRef, setSyncStatus, setHouseholdCode, lastSyncedRef, pendingTimersRef]);

  const changeHouseholdCode = useCallback(async (newCode: string) => {
    const normalized = newCode.trim().toUpperCase();
    if (!isValidHouseholdCode(normalized)) {
      showToast(faCircleXmark, 'Code must be 6 letters/numbers (no 0, O, 1, or I)');
      return false;
    }
    if (!householdCode || normalized === householdCode) return true;
    setSyncStatus('syncing');
    try {
      await renameHouseholdRow(householdCode, normalized);
      safeSetItem(HOUSEHOLD_CODE_KEY, normalized);
      setHouseholdCode(normalized);
      setSyncStatus('idle');
      setState((prev) => { const next = clone(prev); appendAuditLog(next, actorRef.current, { type: 'syncCodeChanged', label: `Changed sync code to ${normalized}` }); return next; });
      showToast(faCloud, `Sync code changed to ${normalized}`);
      return true;
    } catch (err) {
      setSyncStatus('error');
      if ((err as { code?: string }).code === '23505') {
        showToast(faCircleXmark, 'That code is already taken — try another');
      } else {
        showToast(
          faCircleXmark,
          navigator.onLine ? 'Server error — please try again' : 'No internet connection — try again when back online',
        );
      }
      return false;
    }
  }, [householdCode, setState, showToast, actorRef, setSyncStatus, setHouseholdCode]);

  // --- Parent account actions (Epic 8) ---
  const signUp = useCallback(async (email: string, password: string) => {
    const res = await signUpWithPassword(email, password);
    if (res.ok) showToast(faCircleCheck, 'Account created — check your email to confirm');
    else showToast(faCircleXmark, res.error);
    return res;
  }, [showToast]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await signInWithPassword(email, password);
    if (res.ok) showToast(faCircleCheck, 'Signed in');
    else showToast(faCircleXmark, res.error);
    return res;
  }, [showToast]);

  const sendSignInLink = useCallback(async (email: string) => {
    const res = await sendMagicLink(email);
    if (res.ok) showToast(faEnvelope, 'Check your email for a sign-in link');
    else showToast(faCircleXmark, res.error);
    return res;
  }, [showToast]);

  const signOutAccount = useCallback(async () => {
    await signOutSupabase();
    showToast(faCircleCheck, 'Signed out');
  }, [showToast]);

  // Secures the currently-synced household to the signed-in account (the claim-or-deprecate
  // path for an existing PIN-only household). No-ops harmlessly if already owned by this account.
  const claimHousehold = useCallback(async () => {
    if (!householdCode) return false;
    if (!authUser) {
      showToast(faCircleXmark, 'Sign in first to secure this household');
      return false;
    }
    try {
      await claimHouseholdRpc(householdCode);
      const status = await getHouseholdStatus(householdCode).catch(() => null);
      if (status) setHouseholdStatus(status);
      setState((prev) => { const next = clone(prev); appendAuditLog(next, actorRef.current, { type: 'householdClaimed', label: `Secured household (code ${householdCode}) to account` }); return next; });
      showToast(faCircleCheck, 'Household secured to your account');
      return true;
    } catch (err) {
      const message = (err as { message?: string }).message;
      showToast(
        faCircleXmark,
        message?.includes('already claimed')
          ? 'This household is already owned by another account'
          : navigator.onLine ? 'Server error — please try again' : 'No internet connection — try again when back online',
      );
      return false;
    }
  }, [householdCode, authUser, setState, showToast, actorRef, setHouseholdStatus]);

  return {
    createHousehold, joinHousehold, leaveHousehold, deleteHouseholdEverywhere, changeHouseholdCode,
    signUp, signIn, sendSignInLink, signOutAccount, claimHousehold,
  };
}

import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
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
  findMyHouseholdCode,
  getHouseholdStatus,
  resendSignUpConfirmation,
  sendMagicLink,
  signInWithPassword,
  signOut as signOutSupabase,
  signUpWithPassword,
} from '../auth';
import { HOUSEHOLD_CODE_KEY, activeStateOf, buildMergedRoot, clone } from './shared';
import type { SyncStatus } from './types';

export interface HouseholdDeps {
  setState: Dispatch<SetStateAction<GravyState>>;
  setRoot: Dispatch<SetStateAction<GravyRoot>>;
  stateRef: MutableRefObject<GravyState>;
  rootRef: MutableRefObject<GravyRoot>;
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
    setState, setRoot, stateRef, rootRef, actorRef, setSyncStatus,
    setHouseholdCode, lastSyncedRef, pendingTimersRef, householdCode, authUser, setHouseholdStatus,
  } = deps;

  const createHousehold = useCallback(async (customCode?: string) => {
    if (customCode) {
      const normalized = customCode.trim().toUpperCase();
      if (!isValidHouseholdCode(normalized)) return null;
      setSyncStatus('syncing');
      try {
        const merged = buildMergedRoot(rootRef.current, stateRef.current);
        await createHouseholdRow(normalized, merged);
        lastSyncedRef.current = JSON.stringify(merged);
        safeSetItem(HOUSEHOLD_CODE_KEY, normalized);
        setHouseholdCode(normalized);
        setSyncStatus('idle');
        setState((prev) => { const next = clone(prev); appendAuditLog(next, actorRef.current, { type: 'syncEnabled', label: `Enabled cloud sync (code ${normalized})` }); return next; });
        return normalized;
      } catch {
        setSyncStatus('error');
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
        return code;
      } catch (err) {
        if ((err as { code?: string }).code === '23505' && attempt < 4) continue;
        setSyncStatus('error');
        return null;
      }
    }
    return null;
  }, [setState, stateRef, rootRef, actorRef, setSyncStatus, setHouseholdCode, lastSyncedRef]);

  const joinHousehold = useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase();
    setSyncStatus('syncing');
    try {
      const remoteRoot = await fetchHousehold(normalized);
      if (!remoteRoot) {
        setSyncStatus('error');
        return false;
      }
      const profiles: ProfileEntry[] = (remoteRoot.profiles || [])
        .filter((p) => p && p.state)
        .map((p) => ({ id: p.id, state: hydrateState(p.state) }));
      if (profiles.length === 0) {
        setSyncStatus('error');
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
      return true;
    } catch {
      setSyncStatus('error');
      return false;
    }
  }, [setState, setRoot, actorRef, setSyncStatus, setHouseholdCode, lastSyncedRef]);

  const leaveHousehold = useCallback(() => {
    // Cancel any deferred celebration overlays queued just before disconnecting — they'd
    // otherwise still fire afterward, referencing a state snapshot from the now-disconnected sync.
    pendingTimersRef.current.forEach((t) => clearTimeout(t));
    pendingTimersRef.current = [];
    safeRemoveItem(HOUSEHOLD_CODE_KEY);
    setHouseholdCode(null);
    lastSyncedRef.current = null;
    setSyncStatus('idle');
    setState((prev) => { const next = clone(prev); appendAuditLog(next, actorRef.current, { type: 'syncDisabled', label: 'Turned off cloud sync (this device)' }); return next; });
  }, [setState, actorRef, setSyncStatus, setHouseholdCode, lastSyncedRef, pendingTimersRef]);

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
      return true;
    } catch {
      setSyncStatus('error');
      return false;
    }
  }, [householdCode, setState, actorRef, setSyncStatus, setHouseholdCode, lastSyncedRef, pendingTimersRef]);

  const changeHouseholdCode = useCallback(async (newCode: string) => {
    const normalized = newCode.trim().toUpperCase();
    if (!isValidHouseholdCode(normalized)) return false;
    if (!householdCode || normalized === householdCode) return true;
    setSyncStatus('syncing');
    try {
      await renameHouseholdRow(householdCode, normalized);
      safeSetItem(HOUSEHOLD_CODE_KEY, normalized);
      setHouseholdCode(normalized);
      setSyncStatus('idle');
      setState((prev) => { const next = clone(prev); appendAuditLog(next, actorRef.current, { type: 'syncCodeChanged', label: `Changed sync code to ${normalized}` }); return next; });
      return true;
    } catch {
      setSyncStatus('error');
      return false;
    }
  }, [householdCode, setState, actorRef, setSyncStatus, setHouseholdCode]);

  // --- Parent account actions (Epic 8) ---
  const signUp = useCallback(async (email: string, password: string) => {
    return signUpWithPassword(email, password);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    return signInWithPassword(email, password);
  }, []);

  const sendSignInLink = useCallback(async (email: string) => {
    return sendMagicLink(email);
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    return resendSignUpConfirmation(email);
  }, []);

  // Looks up the signed-in caller's own household by account membership — see gravy_my_household_code.
  const findMyHousehold = useCallback(async () => {
    return findMyHouseholdCode();
  }, []);

  const signOutAccount = useCallback(async () => {
    await signOutSupabase();
  }, []);

  // Secures the currently-synced household to the signed-in account (the claim-or-deprecate
  // path for an existing PIN-only household). No-ops harmlessly if already owned by this account.
  const claimHousehold = useCallback(async () => {
    if (!householdCode) return false;
    if (!authUser) return false;
    try {
      await claimHouseholdRpc(householdCode);
      const status = await getHouseholdStatus(householdCode).catch(() => null);
      if (status) setHouseholdStatus(status);
      setState((prev) => { const next = clone(prev); appendAuditLog(next, actorRef.current, { type: 'householdClaimed', label: `Secured household (code ${householdCode}) to account` }); return next; });
      return true;
    } catch {
      return false;
    }
  }, [householdCode, authUser, setState, actorRef, setHouseholdStatus]);

  return {
    createHousehold, joinHousehold, leaveHousehold, deleteHouseholdEverywhere, changeHouseholdCode,
    signUp, signIn, sendSignInLink, resendConfirmation, findMyHousehold, signOutAccount, claimHousehold,
  };
}

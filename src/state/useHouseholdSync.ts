import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { GravyRoot, GravyState, ProfileEntry } from './types';
import { hydrateState, mirrorSharedFields } from './defaultState';
import type { LogActor } from './actionLog';
import { pushHouseholdState, subscribeToHousehold } from './sync';
import { mergeRoots } from './merge';
import { safeGetItem } from './storage';
import {
  type AuthUser,
  type HouseholdStatus,
  claimHousehold,
  getHouseholdStatus,
  isPasswordRecoveryRedirect,
  onAuthChange,
  onPasswordRecovery,
} from './auth';
import { HOUSEHOLD_CODE_KEY, activeStateOf, buildMergedRoot } from './actions/shared';
import type { SyncStatus } from './actions/types';

export interface HouseholdSyncDeps {
  root: GravyRoot;
  state: GravyState;
  setRoot: Dispatch<SetStateAction<GravyRoot>>;
  setState: Dispatch<SetStateAction<GravyState>>;
}

export interface HouseholdSyncValue {
  householdCode: string | null;
  setHouseholdCode: Dispatch<SetStateAction<string | null>>;
  syncStatus: SyncStatus;
  setSyncStatus: Dispatch<SetStateAction<SyncStatus>>;
  authUser: AuthUser | null;
  authReady: boolean;
  householdStatus: HouseholdStatus | null;
  setHouseholdStatus: Dispatch<SetStateAction<HouseholdStatus | null>>;
  // True from the moment the user lands via a password-reset email link until they finish
  // setting a new password (ResetPasswordScreen calls clearPasswordRecovery). Drives that
  // screen's mandatory-overlay visibility, the same way onboarding/SyncGateModal work.
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
  // Last root JSON we pushed to / received from Supabase, so the outgoing-push effect can skip
  // echoing a snapshot the realtime subscription just handed us.
  lastSyncedRef: MutableRefObject<string | null>;
  // Stamped with the signed-in parent account by the auth effect below; read synchronously by the
  // audit-log helpers in the action hooks so every entry records who performed it (Epic 8 item 5/6).
  actorRef: MutableRefObject<LogActor | undefined>;
}

// Owns the cloud-sync + parent-account reactive layer: the household code / sync status / auth /
// ownership-status state and the four effects that wire Supabase realtime (push/subscribe), auth
// tracking, and ownership-status refresh. Extracted from GravyContext so the provider keeps only its
// local concerns (celebration/theme/rollover/persist) and this sync engine reads on its own.
// The imperative create/join/leave/claim actions live in `./actions/useHouseholdActions.ts`; this
// hook is the reactive half they share state with via the setters/refs returned here.
export function useHouseholdSync({ root, state, setRoot, setState }: HouseholdSyncDeps): HouseholdSyncValue {
  const [householdCode, setHouseholdCode] = useState<string | null>(() =>
    safeGetItem(HOUSEHOLD_CODE_KEY),
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  // Parent account (Epic 8). This IS the access gate — GravyContext derives grownUpUnlocked from
  // authUser + householdStatus (see isGrownUpUnlocked in ./auth.ts). authReady gates UI until the
  // initial session check resolves.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [householdStatus, setHouseholdStatus] = useState<HouseholdStatus | null>(null);
  // Seeded from the URL synchronously (see isPasswordRecoveryRedirect in auth.ts) rather than
  // false — the onPasswordRecovery effect below is a same-tab fallback for Supabase's own async
  // event, which fires after a network round trip and can be missed if it beats this effect's
  // subscription (see that export's comment for why this isn't just belt-and-suspenders).
  const [passwordRecovery, setPasswordRecovery] = useState(isPasswordRecoveryRedirect);
  const lastSyncedRef = useRef<string | null>(null);
  const actorRef = useRef<LogActor | undefined>(undefined);
  // Latest root/state mirrored into refs so the realtime-receive effect (which only re-subscribes
  // on householdCode) can merge an incoming snapshot against the *current* local root without stale
  // closure captures. Read only inside the subscription callback, never during render.
  const rootRef = useRef(root);
  // eslint-disable-next-line react-hooks/refs
  rootRef.current = root;
  const stateRef = useRef(state);
  // eslint-disable-next-line react-hooks/refs
  stateRef.current = state;

  // Track the signed-in parent account. Fires once on mount with the current session (or null)
  // and again on every sign-in/out.
  useEffect(() => {
    const unsub = onAuthChange((user) => {
      setAuthUser(user);
      setAuthReady(true);
      actorRef.current = user ? { userId: user.id } : undefined;
    });
    return unsub;
  }, []);

  // Track password-recovery links separately from ordinary sign-in — landing via one still
  // fires onAuthChange above (a session is established either way), but this flags the
  // ResetPasswordScreen overlay so the user sets a new password before doing anything else.
  useEffect(() => {
    return onPasswordRecovery(() => setPasswordRecovery(true));
  }, []);

  const clearPasswordRecovery = useCallback(() => setPasswordRecovery(false), []);

  // Refresh whether the current household is claimed whenever the code or the signed-in account
  // changes. Also self-heals households created before accounts were mandatory: those rows have
  // no owner and no members, so a signed-in device synced to one would otherwise be permanently
  // locked out (there's no UI path to claim a household left, since reaching Settings itself
  // requires already being unlocked). If the household is unclaimed and we're signed in, claim it
  // automatically — this is the same action the old "Secure this household" button took, just
  // automatic; gravy_claim_household is idempotent for the existing owner and safely rejects if
  // another account has already claimed it in the meantime. A failed claim attempt (offline,
  // already claimed by someone else) just leaves the pre-claim status in place; a failed initial
  // status fetch (offline, no household) leaves status null.
  useEffect(() => {
    if (!householdCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHouseholdStatus(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let status = await getHouseholdStatus(householdCode);
        if (!status.claimed && authUser) {
          try {
            await claimHousehold(householdCode);
          } catch {
            // Rejected (e.g. someone else claimed it first) or offline — re-fetch below
            // regardless, since the true status may have changed either way.
          }
          try {
            status = await getHouseholdStatus(householdCode);
          } catch {
            // Offline — fall back to the pre-claim-attempt status fetched above.
          }
        }
        if (!cancelled) setHouseholdStatus(status);
      } catch {
        if (!cancelled) setHouseholdStatus(null);
      }
    })();
    return () => { cancelled = true; };
  }, [householdCode, authUser]);

  // Push local changes to Supabase when in a synced household. The whole root (all profiles +
  // shared config) is the synced payload, so every device shares every kid.
  useEffect(() => {
    if (!householdCode) return;
    const merged = buildMergedRoot(root, state);
    const json = JSON.stringify(merged);
    if (json === lastSyncedRef.current) return;
    setSyncStatus('syncing');
    const timeout = setTimeout(() => {
      // Mark this snapshot as "seen" before the request resolves, not after. The realtime
      // postgres_changes echo of this exact write can arrive over the websocket before this
      // RPC's HTTP response comes back (they're independent round trips) — if the receive
      // effect doesn't yet recognize the echo as its own, it merges it in, and since scalars
      // like todayGoals/points/counters are last-write-wins from the remote snapshot, that
      // clobbers any click made in between with this (now-stale) echoed state. Setting it here
      // closes that window regardless of which round trip finishes first.
      lastSyncedRef.current = json;
      pushHouseholdState(householdCode, merged)
        .then(() => {
          setSyncStatus('idle');
        })
        .catch(() => setSyncStatus('error'));
    }, 800);
    return () => clearTimeout(timeout);
  }, [state, root, householdCode]);

  // Receive remote changes from other devices in the household
  useEffect(() => {
    if (!householdCode) return;
    return subscribeToHousehold(householdCode, (remoteRoot) => {
      try {
        const incomingJson = JSON.stringify(remoteRoot);
        if (incomingJson === lastSyncedRef.current) return;
        const remoteProfiles: ProfileEntry[] = (remoteRoot.profiles || [])
          .filter((p) => p && p.state)
          .map((p) => ({ id: p.id, state: hydrateState(p.state) }));
        if (remoteProfiles.length === 0) return;
        const hydratedRemote: GravyRoot = {
          version: 2,
          activeProfileId: remoteRoot.activeProfileId,
          profiles: remoteProfiles,
        };
        // Merge the arriving snapshot into the *current* local root (via refs, since this effect
        // only re-subscribes on householdCode) rather than replacing it — so id-keyed collections
        // (goals/rewards/logs) edited locally but not yet pushed survive the remote update
        // instead of being clobbered. Scalars/counters still take the remote value (last-write-wins).
        const finalRoot = mergeRoots(buildMergedRoot(rootRef.current, stateRef.current), hydratedRemote);
        mirrorSharedFields(finalRoot);
        // Mark the *incoming* snapshot as seen so an identical re-delivery is ignored. We
        // deliberately don't mark `finalRoot`: when the merge folded in local-only collection
        // items the peer hasn't got yet, finalRoot != incoming, and the outgoing-push effect
        // should re-send that merged result so the peer converges. The merge is idempotent, so
        // this settles rather than echoing forever.
        lastSyncedRef.current = incomingJson;
        setRoot(finalRoot);
        setState(activeStateOf(finalRoot));
      } catch {
        // Ignore malformed realtime payloads rather than crashing the whole app.
      }
    });
  }, [householdCode, setRoot, setState]);

  return {
    householdCode, setHouseholdCode,
    syncStatus, setSyncStatus,
    authUser, authReady,
    householdStatus, setHouseholdStatus,
    passwordRecovery, clearPasswordRecovery,
    lastSyncedRef, actorRef,
  };
}

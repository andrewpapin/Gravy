// Collection/record-level merge for cloud sync (BACKLOG Epic 9).
//
// The old sync model was whole-blob last-write-wins: whenever a remote `GravyRoot` arrived over
// realtime (or a device pushed), it replaced the local copy outright, so any change the other side
// hadn't seen yet was silently dropped. That's fine for a single device but loses data the moment
// two parents (or a parent + a kid's device) edit at once — increasingly the normal case as real
// accounts make multi-device-per-household routine.
//
// `mergeRoots(local, remote)` reconciles the two instead of clobbering. The scope is deliberately
// narrow (not a general CRDT): id-keyed *collections* are unioned so additions/edits on either side
// survive, while live progress scalars/counters keep last-write-wins — the arriving (`remote`)
// snapshot wins those. `remote` is the more-recently-observed side at the call site (the realtime
// payload, or the row just fetched), so preferring it on a same-id conflict matches the old LWW
// feel for the fields that still use it, while the collection unions stop the data loss.
//
// Convergence: union ops are idempotent and order-independent; scalar LWW always takes `remote`. So
// re-applying the same remote payload is a no-op, and because a receiver re-pushes its merged result
// (see GravyContext's sync effects) both devices settle on union-of-collections + last-writer's
// scalars. Pure and side-effect-free so it's unit-testable in isolation (see merge.test.ts).
import type {
  ActionLogEntry,
  AuditLogEntry,
  BadgeOverride,
  DayLog,
  Goal,
  GravyRoot,
  GravyState,
  ProfileEntry,
  Reward,
} from './types';

// Union two id-keyed arrays. Every id from either side is kept; on a shared id the `remote` record
// wins (LWW within the record). `remote` order is preserved, then local-only items are appended, so
// the list stays stable to the most-recent snapshot the user just saw arrive.
function mergeById<T extends { id: number }>(local: T[], remote: T[]): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const item of remote) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  for (const item of local) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

// Union two append-only id-keyed logs (action/audit), sorted chronologically by `at`. History is
// never dropped: an entry present on either side is kept. For action-log entries the `undone` flag
// is monotonic (an undo is a forward action), so a shared id is kept undone if either side undid it.
function mergeLog<T extends { id: string; at: number; undone?: boolean }>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();
  for (const entry of local) byId.set(entry.id, entry);
  for (const entry of remote) {
    const existing = byId.get(entry.id);
    byId.set(entry.id, existing ? { ...entry, undone: existing.undone || entry.undone } : entry);
  }
  return [...byId.values()].sort((a, b) => a.at - b.at);
}

// Union a string-keyed record (badgeConfig, dayLogs), `remote` winning a shared key.
function mergeRecord<V>(local: Record<string, V>, remote: Record<string, V>): Record<string, V> {
  return { ...local, ...remote };
}

// Merge one profile's state. Collections union; live progress scalars/counters/settings keep
// last-write-wins by taking the `remote` snapshot (it spreads in as the base). pendingRewards stays
// LWW too: it's an add/remove set, and unioning it would resurrect rewards another device already
// approved — reconciling that safely needs tombstones / the offline-queue work, out of scope here.
export function mergeStates(local: GravyState, remote: GravyState): GravyState {
  return {
    ...remote,
    goals: mergeById<Goal>(local.goals, remote.goals),
    rewards: mergeById<Reward>(local.rewards, remote.rewards),
    badgeConfig: mergeRecord<BadgeOverride>(local.badgeConfig, remote.badgeConfig),
    dayLogs: mergeRecord<DayLog>(local.dayLogs, remote.dayLogs),
    earnedBadges: [...new Set([...local.earnedBadges, ...remote.earnedBadges])],
    actionLog: mergeLog<ActionLogEntry>(local.actionLog, remote.actionLog),
    auditLog: mergeLog<AuditLogEntry>(local.auditLog ?? [], remote.auditLog ?? []),
  };
}

// Reconcile two whole roots. Profiles union by id: a profile on both sides is state-merged; a
// profile on only one side is kept (a kid added on another device must appear; a kid added locally
// but not yet pushed must not vanish). The active profile follows `remote` when that id still
// exists in the merged set, else falls back to local's, else the first profile.
export function mergeRoots(local: GravyRoot, remote: GravyRoot): GravyRoot {
  const localById = new Map(local.profiles.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const profiles: ProfileEntry[] = [];

  for (const remoteProfile of remote.profiles) {
    seen.add(remoteProfile.id);
    const localProfile = localById.get(remoteProfile.id);
    profiles.push({
      id: remoteProfile.id,
      state: localProfile ? mergeStates(localProfile.state, remoteProfile.state) : remoteProfile.state,
    });
  }
  for (const localProfile of local.profiles) {
    if (seen.has(localProfile.id)) continue;
    profiles.push(localProfile);
  }

  const hasRemoteActive = profiles.some((p) => p.id === remote.activeProfileId);
  const hasLocalActive = profiles.some((p) => p.id === local.activeProfileId);
  const activeProfileId = hasRemoteActive
    ? remote.activeProfileId
    : hasLocalActive
      ? local.activeProfileId
      : profiles[0]?.id;

  return { version: 2, activeProfileId, profiles };
}

// Shared constants and pure root/state helpers used by GravyContext, the `useHouseholdSync` sync
// engine, and the per-domain action hooks under this folder. Kept here (not in GravyContext) so the
// hooks can import them without a circular dependency back into the provider module.
import type { GravyRoot, GravyState } from '../types';
import { mirrorSharedFields } from '../defaultState';

export const HOUSEHOLD_CODE_KEY = 'gravy_household_code';
export const SYNC_SKIPPED_KEY = 'gravy_sync_skipped';
// Caps how many game wins count toward points per day, so a kid can't farm an easy
// round on repeat — beyond this, wins still feel celebratory but stop paying out.
export const DAILY_GAME_WIN_CAP = 3;

export function clone(state: GravyState): GravyState {
  return JSON.parse(JSON.stringify(state));
}

// Folds the live active-profile state back into the root and re-mirrors the shared config across
// every profile. The single source of truth for the active kid is the `state` useState; the rest
// of the root carries the other profiles. This is the canonical shape we persist and sync.
export function buildMergedRoot(root: GravyRoot, activeState: GravyState): GravyRoot {
  const merged: GravyRoot = {
    version: 2,
    activeProfileId: root.activeProfileId,
    profiles: root.profiles.map((p) =>
      p.id === root.activeProfileId ? { id: p.id, state: activeState } : p,
    ),
  };
  mirrorSharedFields(merged);
  return merged;
}

export function activeStateOf(root: GravyRoot): GravyState {
  const entry = root.profiles.find((p) => p.id === root.activeProfileId) || root.profiles[0];
  return entry.state;
}

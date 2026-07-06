// Shared types for the per-domain action hooks: the sync-status enum, the dependency function
// signatures the provider hands each hook (its celebration/award helpers), and the
// setting/profile patch shapes. Kept separate so hooks and GravyContext agree on one definition.
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import type { DayLog, GravyState, Settings } from '../types';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export type ShowCelebration = (icon: IconDefinition | string, title: string, sub: string) => void;
export type AwardPoints = (next: GravyState, pts: number) => void;
export type AwardPointsForDay = (next: GravyState, log: DayLog, pts: number) => void;
export type MaybeCelebrateRankUp = (prevTotalPoints: number, next: GravyState, delayMs?: number) => void;

// Excludes foodPtsByItem — set per food item via saveFoodPts, not this generic setter.
export type SettableSettingKey = Exclude<keyof Settings, 'foodPtsByItem'>;

// Per-kid identity fields a parent can edit for any profile.
export type ProfilePatch = Partial<
  Pick<Settings, 'childName' | 'avatarIcon' | 'avatarIconColor' | 'avatarBgColor' | 'theme'>
>;

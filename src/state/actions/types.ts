// Shared types for the per-domain action hooks: the sync-status enum, the dependency function
// signatures the provider hands each hook (its toast/celebration/award/badge helpers), and the
// setting/profile patch shapes. Kept separate so hooks and GravyContext agree on one definition.
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import type { DayLog, GravyState, Settings } from '../types';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export type ShowToast = (icon: IconDefinition | string, msg: string) => void;
export type ShowCelebration = (icon: IconDefinition | string, title: string, sub: string) => void;
export type AwardPoints = (next: GravyState, pts: number, reason: string, opts?: { silent?: boolean }) => void;
export type AwardPointsForDay = (next: GravyState, log: DayLog, pts: number, reason: string, opts?: { silent?: boolean }) => void;
export type MaybeCelebrateRankUp = (prevTotalPoints: number, next: GravyState, delayMs?: number) => void;
export type CheckBadges = (next: GravyState, delayMs?: number) => void;

// pinHash/pinSalt/recoveryAnswerHash/recoveryAnswerSalt are internal-only — callers set the PIN
// or recovery answer via the virtual 'pin'/'recoveryAnswer' keys, never the hash/salt fields directly.
export type SettableSettingKey = Exclude<keyof Settings, 'pinHash' | 'pinSalt' | 'recoveryAnswerHash' | 'recoveryAnswerSalt'> | 'pin' | 'recoveryAnswer';

// Per-kid identity fields a parent can edit for any profile.
export type ProfilePatch = Partial<
  Pick<Settings, 'childName' | 'avatarIcon' | 'avatarIconColor' | 'avatarBgColor' | 'theme'>
>;

import { supabase } from '../lib/supabaseClient';
import type { GravyRoot } from './types';

// Epic 8 — Real Auth & Account Model. Thin wrappers around Supabase Auth so the rest of the
// app never imports the supabase client for auth directly, and so the parent-account model is
// decoupled from the kid-screen PIN (which stays a per-device session lock — see
// src/state/grownUpUnlock.ts / src/state/pinLockout.ts).
//
// IMPORTANT (COPPA): an account is a *parent* identity only. Nothing here ever collects a
// child's name or progress — that lives in the in-app GravyState after a parent is signed in.
// See DATA_HANDLING.md.

export interface AuthUser {
  id: string;
  email: string | null;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

// Supabase surfaces auth failures with reasonably friendly messages already; this just gives a
// stable fallback and trims the noisy ones we know about.
function authError(err: { message?: string } | null): string {
  const msg = err?.message?.trim();
  if (!msg) return navigator.onLine ? 'Something went wrong — please try again' : 'No internet connection — try again when back online';
  return msg;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, email: u.email ?? null } : null;
}

// Fires immediately with the current user (or null) and again on every sign-in/out. Returns an
// unsubscribe function.
export function onAuthChange(cb: (user: AuthUser | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    cb(u ? { id: u.id, email: u.email ?? null } : null);
  });
  return () => data.subscription.unsubscribe();
}

export async function signUpWithPassword(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({ email: email.trim(), password });
  return error ? { ok: false, error: authError(error) } : { ok: true };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? { ok: false, error: authError(error) } : { ok: true };
}

// Passwordless magic-link sign-in. The link returns the user to the app's current origin.
export async function sendMagicLink(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  });
  return error ? { ok: false, error: authError(error) } : { ok: true };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// --- Household ownership (Epic 8 item 3/4) -------------------------------------------------

export interface HouseholdStatus {
  claimed: boolean;
  isMember: boolean;
  isOwner: boolean;
}

// gravy_household_status returns a single-row table; PostgREST may surface that as an array or a
// bare object depending on the call. Normalize either shape (and a null/missing row) into a
// fully-defaulted HouseholdStatus. Pure + exported so it can be unit-tested without Supabase.
export function normalizeHouseholdStatus(data: unknown): HouseholdStatus {
  const row = (Array.isArray(data) ? data[0] : data) as
    | { claimed?: unknown; is_member?: unknown; is_owner?: unknown }
    | null
    | undefined;
  return {
    claimed: !!row?.claimed,
    isMember: !!row?.is_member,
    isOwner: !!row?.is_owner,
  };
}

// Claims a previously-unclaimed household for the signed-in account (or no-ops if the caller
// already owns it). Returns the household state so the caller can keep using it. Throws on a
// code already owned by another account, or if not signed in.
export async function claimHousehold(code: string): Promise<GravyRoot> {
  const { data, error } = await supabase.rpc('gravy_claim_household', { p_code: code });
  if (error) throw error;
  return data as GravyRoot;
}

// Whether a code is claimed at all, and the caller's relationship to it — drives the
// "secure this household" prompt in the UI.
export async function getHouseholdStatus(code: string): Promise<HouseholdStatus> {
  const { data, error } = await supabase.rpc('gravy_household_status', { p_code: code });
  if (error) throw error;
  return normalizeHouseholdStatus(data);
}

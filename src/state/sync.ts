import { supabase } from '../lib/supabaseClient';
import type { GravyRoot } from './types';

// Avoid visually ambiguous characters (0/O, 1/I, etc.)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateHouseholdCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

const HOUSEHOLD_CODE_PATTERN = new RegExp(`^[${CODE_CHARS}]{6}$`);

export function isValidHouseholdCode(code: string): boolean {
  return HOUSEHOLD_CODE_PATTERN.test(code);
}

// Routed through a SECURITY DEFINER RPC (rather than a direct table insert) so the anon
// role doesn't need a blanket INSERT grant — see supabase/migrations/20260623000000_scope_household_mutations.sql.
export async function createHousehold(code: string, state: GravyRoot): Promise<void> {
  const { error } = await supabase.rpc('gravy_create_household', { p_code: code, p_state: state });
  if (error) throw error;
}

// Routed through a SECURITY DEFINER RPC — see supabase/migrations/20260623000000_scope_household_mutations.sql.
export async function renameHousehold(oldCode: string, newCode: string): Promise<void> {
  const { error } = await supabase.rpc('gravy_rename_household', { p_old_code: oldCode, p_new_code: newCode });
  if (error) throw error;
}

// Routed through a SECURITY DEFINER RPC (rather than a direct table select) so lookups by
// code are rate-limited per source IP — see
// supabase/migrations/20260623184956_rate_limit_household_lookup.sql.
export async function fetchHousehold(code: string): Promise<GravyRoot | null> {
  const { data, error } = await supabase.rpc('gravy_lookup_household', { p_code: code });
  if (error) throw error;
  return (data as GravyRoot | null) ?? null;
}

// Routed through a SECURITY DEFINER RPC — see supabase/migrations/20260623000000_scope_household_mutations.sql.
export async function pushHouseholdState(code: string, state: GravyRoot): Promise<void> {
  const { error } = await supabase.rpc('gravy_upsert_household_state', { p_code: code, p_state: state });
  if (error) throw error;
}

// Deletes the household row everywhere (all devices synced to this code lose access to it),
// as opposed to leaveHousehold()'s local-only disconnect — see
// supabase/migrations/20260623225331_delete_household_everywhere.sql.
export async function deleteHousehold(code: string): Promise<void> {
  const { error } = await supabase.rpc('gravy_delete_household', { p_code: code });
  if (error) throw error;
}

// Minimal structural check on a realtime payload before handing it to the app — a
// malformed row (flaky replication, a buggy peer client, or RLS ever being misconfigured)
// shouldn't be trusted just because it arrived over the household's postgres_changes
// channel. Deeper per-profile validation still happens in hydrateState/sanitizeState once
// this passes.
export function isValidHouseholdStatePayload(v: unknown): v is GravyRoot {
  return !!v && typeof v === 'object' && !Array.isArray(v) && Array.isArray((v as { profiles?: unknown }).profiles);
}

export function subscribeToHousehold(code: string, onUpdate: (state: GravyRoot) => void): () => void {
  const channel = supabase
    .channel(`household-${code}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'households', filter: `code=eq.${code}` },
      (payload) => {
        const incomingState = (payload.new as { state?: unknown } | null)?.state;
        if (isValidHouseholdStatePayload(incomingState)) {
          onUpdate(incomingState);
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

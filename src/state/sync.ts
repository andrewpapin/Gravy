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

export async function createHousehold(code: string, state: GravyRoot): Promise<void> {
  const { error } = await supabase.from('households').insert({ code, state });
  if (error) throw error;
}

export async function fetchHousehold(code: string): Promise<GravyRoot | null> {
  const { data, error } = await supabase
    .from('households')
    .select('state')
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  return data ? (data.state as GravyRoot) : null;
}

export async function pushHouseholdState(code: string, state: GravyRoot): Promise<void> {
  const { error } = await supabase
    .from('households')
    .upsert({ code, state, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export function subscribeToHousehold(code: string, onUpdate: (state: GravyRoot) => void): () => void {
  const channel = supabase
    .channel(`household-${code}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'households', filter: `code=eq.${code}` },
      (payload) => {
        onUpdate(payload.new.state as GravyRoot);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

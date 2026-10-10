/**
 * The connection to the Fuzzies cloud (Supabase). Turned on by building with a Supabase URL and public
 * key (see vite.config.ts and BACKEND.md); without them the app keeps everything on the device.
 * The Supabase library is a separate download, fetched only when the cloud is actually used.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const cloudEnabled = !!(__SUPABASE_URL__ && __SUPABASE_KEY__);

let clientP: Promise<SupabaseClient> | null = null;

export function supa(): Promise<SupabaseClient> {
  if (!cloudEnabled) return Promise.reject(new Error('Cloud accounts are not switched on yet.'));
  clientP ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(__SUPABASE_URL__, __SUPABASE_KEY__, {
    // pkce: email links come back as ?code=… which doesn't clash with our #/ routes
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }));
  return clientP;
}

/** Turn Supabase / network errors into something a person can act on. */
export function friendly(e: unknown): Error {
  const msg = (e as { message?: string })?.message ?? String(e);
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return new Error('Wrong email or password.');
  if (m.includes('already registered') || m.includes('already been registered')) return new Error('There’s already an account with that email — log in instead.');
  if (m.includes('email not confirmed')) return new Error('Please confirm your email first — check your inbox for our link.');
  if (m.includes('password should be') || m.includes('weak password')) return new Error('Please pick a stronger password (at least 6 characters).');
  if (m.includes('rate limit') || m.includes('too many')) return new Error('Too many tries — please wait a minute and try again.');
  if (m.includes('error sending')) return new Error('We couldn’t send the email just now — please try again in a minute.');
  if (m.includes('unable to validate email') || m.includes('invalid email')) return new Error('That email address doesn’t look right.');
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) return new Error('Can’t reach Fuzzies right now — check your internet and try again.');
  return e instanceof Error ? e : new Error(msg);
}

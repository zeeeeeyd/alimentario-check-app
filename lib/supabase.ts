import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

/**
 * Reads runtime config from Expo's `extra`. This works in production builds.
 * Falls back gracefully and avoids crashing the app on startup.
 */
type Extra = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

const extra = ((): Extra => {
  // Try the modern field first
  // @ts-ignore - API differs across runtimes
  const cfg = Constants?.expoConfig?.extra ?? Constants?.manifest2?.extra ?? Constants?.manifest?.extra ?? {};
  return cfg as Extra;
})();

const url = extra.SUPABASE_URL;
const anon = extra.SUPABASE_ANON_KEY;

// Export a boolean you can use in UI to show a nice "not configured" screen instead of crashing
export const isSupabaseConfigured = Boolean(url && anon);

// Lazily create client with try/catch so we never crash the bundle on import
let _supabase: SupabaseClient | null = null;

try {
  if (!url || !anon) {
    // Do not throw; just log a clear error. The caller can check `isSupabaseConfigured`.
    console.error('Supabase not configured. Missing SUPABASE_URL or SUPABASE_ANON_KEY in expo.extra.');
  } else {
    _supabase = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // recommended for native apps
      },
      global: { headers: { 'x-client-info': 'alimentario-checkin' } },
    });
  }
} catch (e) {
  console.error('Failed to initialize Supabase client:', e);
}

/**
 * Accessor that guarantees a meaningful error message if used before configuration.
 * Prefer `if (!isSupabaseConfigured) { ... }` in your UI and avoid calling this until configured.
 */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    throw new Error(
      'Supabase client is not ready. Ensure SUPABASE_URL & SUPABASE_ANON_KEY are set in app.config.js (expo.extra) and rebuild the app.'
    );
  }
  return _supabase;
}

// If your codebase imports a `supabase` singleton, keep this export.
// It will throw on use if unconfigured (when a method is called), but it won't crash on app startup.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = _supabase;
    if (!client) {
      throw new Error(
        `Supabase not configured (missing keys). Attempted to access method/property: ${String(prop)}. ` +
          'Set SUPABASE_URL & SUPABASE_ANON_KEY via EAS secrets -> app.config.js extra, then rebuild.'
      );
    }
    // @ts-ignore
    return client[prop];
  },
});

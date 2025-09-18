// ✅ MUST be before any other imports that might use fetch/URL/crypto
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import { decode, encode } from 'base-64';
if (typeof atob === 'undefined') {
  // @ts-ignore
  global.atob = decode;
}
if (typeof btoa === 'undefined') {
  // @ts-ignore
  global.btoa = encode;
}

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

// Visitor types and database operations
export type VisitorType = 
  | 'visitors' 
  | 'professional_visitors' 
  | 'press' 
  | 'exhibitors' 
  | 'staff' 
  | 'conference' 
  | 'organisateurs' 
  | 'vip';

export const VISITOR_TYPES: Record<VisitorType, string> = {
  visitors: 'General Visitors',
  professional_visitors: 'Professional Visitors',
  press: 'Press',
  exhibitors: 'Exhibitors',
  staff: 'Staff',
  conference: 'Conference Attendees',
  organisateurs: 'Organizers',
  vip: 'VIP',
};

export interface BaseVisitor {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  qr_code: string;
  badge_downloaded: boolean;
  created_at: string;
}

export interface VisitorWithScans extends BaseVisitor {
  visitor_type: VisitorType;
  total_scans: number;
  today_scans: number;
  last_scan: string;
}

export type AnyVisitor = BaseVisitor & {
  visitor_type: VisitorType;
  [key: string]: any;
};

// Database health check
export async function getDatabaseHealth() {
  try {
    if (!isSupabaseConfigured) {
      return { isHealthy: false, error: 'Supabase not configured' };
    }

    const client = getSupabase();
    const { data, error } = await client.from('visitors').select('id').limit(1);
    
    return {
      isHealthy: !error,
      error: error?.message,
      tablesAccessible: !error,
    };
  } catch (error) {
    return {
      isHealthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      tablesAccessible: false,
    };
  }
}

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) {
      console.error('Supabase not configured');
      return false;
    }

    const client = getSupabase();
    const { error } = await client.from('visitors').select('id').limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Database connection test error:', error);
    return false;
  }
}

// Find visitor by QR code across all tables
export async function findVisitorByQRCode(qrCode: string): Promise<VisitorWithScans | null> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured');
  }

  const client = getSupabase();
  const tables: VisitorType[] = [
    'visitors',
    'professional_visitors',
    'press',
    'exhibitors',
    'staff',
    'conference',
    'organisateurs',
    'vip'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await client
        .from(table)
        .select('*')
        .eq('qr_code', qrCode)
        .single();

      if (data && !error) {
        // Record the scan
        await recordVisitorScan(data.id, table, data.full_name);
        
        // Get scan statistics
        const stats = await getVisitorScanStats(data.id, table);
        
        return {
          ...data,
          visitor_type: table,
          total_scans: stats.total,
          today_scans: stats.today,
          last_scan: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error(`Error searching ${table}:`, error);
    }
  }

  return null;
}

// Record a visitor scan
export async function recordVisitorScan(
  visitorId: string,
  visitorType: VisitorType,
  visitorName: string
): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured');
    }

    const client = getSupabase();
    const { error } = await client
      .from('visitor_scans')
      .insert({
        visitor_id: visitorId,
        visitor_type: visitorType,
        visitor_name: visitorName,
        scanned_at: new Date().toISOString(),
        scan_date: new Date().toISOString().split('T')[0],
      });

    if (error) {
      console.error('Error recording scan:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error recording visitor scan:', error);
    return false;
  }
}

// Get visitor scan statistics
export async function getVisitorScanStats(
  visitorId: string,
  visitorType: VisitorType
): Promise<{ total: number; today: number; byDate: Record<string, number> }> {
  try {
    if (!isSupabaseConfigured) {
      return { total: 0, today: 0, byDate: {} };
    }

    const client = getSupabase();
    const today = new Date().toISOString().split('T')[0];

    // Get all scans for this visitor
    const { data: allScans, error: allError } = await client
      .from('visitor_scans')
      .select('scan_date')
      .eq('visitor_id', visitorId)
      .eq('visitor_type', visitorType);

    if (allError) {
      console.error('Error fetching scan stats:', allError);
      return { total: 0, today: 0, byDate: {} };
    }

    const total = allScans?.length || 0;
    const todayScans = allScans?.filter(scan => scan.scan_date === today).length || 0;
    
    // Group by date
    const byDate: Record<string, number> = {};
    allScans?.forEach(scan => {
      byDate[scan.scan_date] = (byDate[scan.scan_date] || 0) + 1;
    });

    return { total, today: todayScans, byDate };
  } catch (error) {
    console.error('Error getting visitor scan stats:', error);
    return { total: 0, today: 0, byDate: {} };
  }
}

// Update badge downloaded status
export async function updateBadgeDownloaded(
  visitorType: VisitorType,
  visitorId: string
): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured');
    }

    const client = getSupabase();
    const { error } = await client
      .from(visitorType)
      .update({ badge_downloaded: true })
      .eq('id', visitorId);

    if (error) {
      console.error('Error updating badge status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating badge downloaded:', error);
    return false;
  }
}
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Visitor = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  profession?: string;
  company?: string;
  qr_code: string;
  badge_downloaded: boolean;
  created_at: string;
};

export type ProfessionalVisitor = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  profession: string;
  company?: string;
  qr_code: string;
  badge_downloaded: boolean;
  created_at: string;
};

export type Press = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  media_outlet: string;
  position: string;
  press_card_number?: string;
  qr_code: string;
  badge_downloaded: boolean;
  created_at: string;
};

export type Exhibitor = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  booth_number?: string;
  position: string;
  qr_code: string;
  badge_downloaded: boolean;
  created_at: string;
};

export type Staff = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  employee_id?: string;
  qr_code: string;
  badge_downloaded: boolean;
  created_at: string;
};

export type Conference = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  organization: string;
  position: string;
  session_access?: string;
  qr_code: string;
  badge_downloaded: boolean;
  created_at: string;
};

export type Organisateur = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  organization: string;
  position: string;
  access_level?: string;
  qr_code: string;
  badge_downloaded: boolean;
  created_at: string;
};

export type VIP = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  organization: string;
  position: string;
  special_access?: string;
  qr_code: string;
  badge_downloaded: boolean;
  created_at: string;
};

export type VisitorType = 
  | 'visitors' 
  | 'professional_visitors' 
  | 'press' 
  | 'exhibitors' 
  | 'staff' 
  | 'conference' 
  | 'organisateurs' 
  | 'vip';

export type AnyVisitor = Visitor | ProfessionalVisitor | Press | Exhibitor | Staff | Conference | Organisateur | VIP;

export type VisitorWithType = AnyVisitor & {
  visitor_type: VisitorType;
  scan_count?: number;
  last_scanned?: string;
};

export const VISITOR_TYPES = {
  visitors: 'General Visitor',
  professional_visitors: 'Professional Visitor',
  press: 'Press',
  exhibitors: 'Exhibitor',
  staff: 'Staff',
  conference: 'Conference Attendee',
  organisateurs: 'Organizer',
  vip: 'VIP'
} as const;

export type VisitorScan = {
  id: string;
  visitor_id: string;
  visitor_type: VisitorType;
  visitor_name: string;
  scanned_at: string;
  scan_date: string;
  created_at: string;
};

export type VisitorWithScans = VisitorWithType & {
  total_scans: number;
  today_scans: number;
  last_scan: string;
};

// Function to search for a visitor across all tables
export async function findVisitorByQRCode(qrCode: string): Promise<VisitorWithScans | null> {
  // Validate input
  if (!qrCode || qrCode.trim().length === 0) {
    return null;
  }

  const cleanQrCode = qrCode.trim();
  
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
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('qr_code', cleanQrCode)
        .single();

      if (data && !error) {
        try {
          // Get scan statistics for this visitor
          const { data: scanStats, error: scanError } = await supabase
            .from('visitor_scans')
            .select('*')
            .eq('visitor_id', data.id)
            .eq('visitor_type', table);

          if (scanError) {
            console.error('Error fetching scan stats:', scanError);
          }

          const today = new Date().toISOString().split('T')[0];
          const todayScans = scanStats?.filter(scan => scan.scan_date === today).length || 0;
          const totalScans = scanStats?.length || 0;
          const lastScan = scanStats?.length > 0 ? scanStats[scanStats.length - 1].scanned_at : '';

          // Record this scan
          const scanRecorded = await recordVisitorScan(data.id, table, data.full_name);
          
          return {
            ...data,
            visitor_type: table,
            total_scans: totalScans + (scanRecorded ? 1 : 0),
            today_scans: todayScans + (scanRecorded ? 1 : 0),
            last_scan: new Date().toISOString()
          };
        } catch (scanError) {
          console.error('Error processing scan data:', scanError);
          // Return visitor data even if scan recording fails
          return {
            ...data,
            visitor_type: table,
            total_scans: 0,
            today_scans: 0,
            last_scan: new Date().toISOString()
          };
        }
      }
    } catch (error) {
      console.error(`Error searching in ${table}:`, error);
      continue;
    }
  }

  return null;
}

// Function to record a visitor scan
export async function recordVisitorScan(visitorId: string, visitorType: VisitorType, visitorName: string): Promise<boolean> {
  try {
    if (!visitorId || !visitorType || !visitorName) {
      console.error('Invalid parameters for recording scan');
      return false;
    }

    const { error } = await supabase
      .from('visitor_scans')
      .insert({
        visitor_id: visitorId,
        visitor_type: visitorType,
        visitor_name: visitorName,
        scanned_at: new Date().toISOString(),
        scan_date: new Date().toISOString().split('T')[0]
      });

    if (error) {
      console.error('Error recording visitor scan:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error recording visitor scan:', error);
    return false;
  }
}

// Function to get visitor scan statistics
export async function getVisitorScanStats(visitorId: string, visitorType: VisitorType) {
  try {
    const { data, error } = await supabase
      .from('visitor_scans')
      .select('*')
      .eq('visitor_id', visitorId)
      .eq('visitor_type', visitorType)
      .order('scanned_at', { ascending: false });

    if (error) return { total: 0, today: 0, byDate: {} };

    const today = new Date().toISOString().split('T')[0];
    const todayScans = data.filter(scan => scan.scan_date === today).length;
    
    // Group scans by date
    const byDate = data.reduce((acc, scan) => {
      const date = scan.scan_date;
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: data.length,
      today: todayScans,
      byDate
    };
  } catch (error) {
    console.error('Error getting scan stats:', error);
    return { total: 0, today: 0, byDate: {} };
  }
}

// Function to update badge download status
export async function updateBadgeDownloaded(visitorType: VisitorType, id: string): Promise<boolean> {
  try {
    if (!visitorType || !id) {
      console.error('Invalid parameters for updating badge status');
      return false;
    }

    const { error } = await supabase
      .from(visitorType)
      .update({ badge_downloaded: true })
      .eq('id', id);

    if (error) {
      console.error('Error updating badge status:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating badge status:', error);
    return false;
  }
}
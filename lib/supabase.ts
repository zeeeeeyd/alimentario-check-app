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

// Function to search for a visitor across all tables
export async function findVisitorByQRCode(qrCode: string): Promise<VisitorWithType | null> {
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
        .eq('qr_code', qrCode)
        .single();

      if (data && !error) {
        return {
          ...data,
          visitor_type: table,
          scan_count: 1,
          last_scanned: new Date().toISOString()
        };
      }
    } catch (error) {
      // Continue searching in other tables
      continue;
    }
  }

  return null;
}

// Function to update badge download status
export async function updateBadgeDownloaded(visitorType: VisitorType, id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(visitorType)
      .update({ badge_downloaded: true })
      .eq('id', id);

    return !error;
  } catch (error) {
    console.error('Error updating badge status:', error);
    return false;
  }
};
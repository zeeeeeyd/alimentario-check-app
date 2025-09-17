import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
  global: {
    headers: {
      'x-client-info': 'expo-camera-qr-scanner',
    },
  },
});

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

// Enhanced error handling utility
class DatabaseError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Helper function to handle database errors
function handleDatabaseError(error: any, operation: string): never {
  console.error(`Database error during ${operation}:`, error);
  
  if (error.code) {
    switch (error.code) {
      case 'PGRST301':
        throw new DatabaseError(`No data found during ${operation}`, error.code, error);
      case 'PGRST116':
        throw new DatabaseError(`Database connection timeout during ${operation}`, error.code, error);
      case '42P01':
        throw new DatabaseError(`Table not found during ${operation}`, error.code, error);
      case '23503':
        throw new DatabaseError(`Foreign key constraint violation during ${operation}`, error.code, error);
      case '23505':
        throw new DatabaseError(`Duplicate key violation during ${operation}`, error.code, error);
      default:
        throw new DatabaseError(`Database operation failed: ${operation}`, error.code, error);
    }
  }
  
  throw new DatabaseError(
    error.message || `Unknown database error during ${operation}`,
    undefined,
    error
  );
}

// Helper function to validate QR code
function validateQRCode(qrCode: string): string {
  if (!qrCode || typeof qrCode !== 'string') {
    throw new Error('Invalid QR code: must be a non-empty string');
  }
  
  const trimmed = qrCode.trim();
  if (trimmed.length === 0) {
    throw new Error('Invalid QR code: cannot be empty or whitespace');
  }
  
  if (trimmed.length < 3) {
    throw new Error('Invalid QR code: too short');
  }
  
  if (trimmed.length > 500) {
    throw new Error('Invalid QR code: too long');
  }
  
  // Remove any potentially harmful characters
  const sanitized = trimmed.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  if (sanitized !== trimmed) {
    throw new Error('Invalid QR code: contains invalid characters');
  }
  
  return sanitized;
}

// Helper function to retry operations with exponential backoff
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Don't retry on certain types of errors
      if (error.code === 'PGRST301' || error.code === '23505') {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Function to search for a visitor across all tables with enhanced error handling
export async function findVisitorByQRCode(qrCode: string): Promise<VisitorWithScans | null> {
  try {
    // Validate and sanitize input
    const cleanQrCode = validateQRCode(qrCode);
    
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

    // Search across all tables with retry logic
    for (const table of tables) {
      try {
        const visitor = await retryOperation(async () => {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('qr_code', cleanQrCode)
            .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no data found

          if (error) {
            handleDatabaseError(error, `searching ${table} table`);
          }

          return data;
        });

        if (visitor) {
          try {
            // Get scan statistics for this visitor with retry logic
            const scanStats = await retryOperation(async () => {
              const { data: scanData, error: scanError } = await supabase
                .from('visitor_scans')
                .select('*')
                .eq('visitor_id', visitor.id)
                .eq('visitor_type', table)
                .order('scanned_at', { ascending: false });

              if (scanError) {
                console.warn('Error fetching scan stats:', scanError);
                return []; // Return empty array instead of throwing
              }

              return scanData || [];
            });

            const today = new Date().toISOString().split('T')[0];
            const todayScans = scanStats.filter(scan => scan.scan_date === today).length;
            const totalScans = scanStats.length;
            const lastScan = scanStats.length > 0 ? scanStats[0].scanned_at : '';

            // Record this scan with retry logic
            const scanRecorded = await retryOperation(async () => {
              return await recordVisitorScan(visitor.id, table, visitor.full_name);
            });
            
            return {
              ...visitor,
              visitor_type: table,
              total_scans: totalScans + (scanRecorded ? 1 : 0),
              today_scans: todayScans + (scanRecorded ? 1 : 0),
              last_scan: new Date().toISOString()
            };
          } catch (scanError) {
            console.warn('Error processing scan data:', scanError);
            // Return visitor data even if scan recording fails
            return {
              ...visitor,
              visitor_type: table,
              total_scans: 0,
              today_scans: 1, // At least count this current scan
              last_scan: new Date().toISOString()
            };
          }
        }
      } catch (error) {
        console.warn(`Error searching in ${table}:`, error);
        // Continue to next table instead of failing completely
        continue;
      }
    }

    return null;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to search for visitor: ${error.message}`,
      undefined,
      error
    );
  }
}

// Function to record a visitor scan with enhanced error handling
export async function recordVisitorScan(
  visitorId: string, 
  visitorType: VisitorType, 
  visitorName: string
): Promise<boolean> {
  try {
    // Validate inputs
    if (!visitorId || typeof visitorId !== 'string') {
      throw new Error('Invalid visitor ID');
    }
    if (!visitorType || !Object.keys(VISITOR_TYPES).includes(visitorType)) {
      throw new Error('Invalid visitor type');
    }
    if (!visitorName || typeof visitorName !== 'string') {
      throw new Error('Invalid visitor name');
    }

    const scanData = {
      visitor_id: visitorId.trim(),
      visitor_type: visitorType,
      visitor_name: visitorName.trim(),
      scanned_at: new Date().toISOString(),
      scan_date: new Date().toISOString().split('T')[0]
    };

    await retryOperation(async () => {
      const { error } = await supabase
        .from('visitor_scans')
        .insert(scanData);

      if (error) {
        handleDatabaseError(error, 'recording visitor scan');
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error recording visitor scan:', error);
    
    // Don't throw error for scan recording failures to avoid breaking the main flow
    if (error instanceof DatabaseError) {
      console.error('Database error details:', error.details);
    }
    
    return false;
  }
}

// Function to get visitor scan statistics with enhanced error handling
export async function getVisitorScanStats(visitorId: string, visitorType: VisitorType) {
  try {
    // Validate inputs
    if (!visitorId || typeof visitorId !== 'string') {
      throw new Error('Invalid visitor ID');
    }
    if (!visitorType || !Object.keys(VISITOR_TYPES).includes(visitorType)) {
      throw new Error('Invalid visitor type');
    }

    const data = await retryOperation(async () => {
      const { data: scanData, error } = await supabase
        .from('visitor_scans')
        .select('*')
        .eq('visitor_id', visitorId.trim())
        .eq('visitor_type', visitorType)
        .order('scanned_at', { ascending: false });

      if (error) {
        handleDatabaseError(error, 'fetching scan statistics');
      }

      return scanData || [];
    });

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

// Function to update badge download status with enhanced error handling
export async function updateBadgeDownloaded(visitorType: VisitorType, id: string): Promise<boolean> {
  try {
    // Validate inputs
    if (!visitorType || !Object.keys(VISITOR_TYPES).includes(visitorType)) {
      throw new Error('Invalid visitor type');
    }
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid visitor ID');
    }

    await retryOperation(async () => {
      const { error } = await supabase
        .from(visitorType)
        .update({ badge_downloaded: true })
        .eq('id', id.trim());

      if (error) {
        handleDatabaseError(error, 'updating badge status');
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error updating badge status:', error);
    
    if (error instanceof DatabaseError) {
      console.error('Database error details:', error.details);
      throw error;
    }
    
    throw new DatabaseError(
      `Failed to update badge status: ${error.message}`,
      undefined,
      error
    );
  }
}

// Function to test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await retryOperation(async () => {
      const { data, error } = await supabase
        .from('visitors')
        .select('count')
        .limit(1);

      if (error) {
        handleDatabaseError(error, 'testing database connection');
      }
    });
    
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

// Function to get database health status
export async function getDatabaseHealth(): Promise<{
  isHealthy: boolean;
  tables: Record<string, boolean>;
  error?: string;
}> {
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

  const tableStatus: Record<string, boolean> = {};
  let overallHealth = true;
  let healthError: string | undefined;

  try {
    // Test each table
    await Promise.allSettled(
      tables.map(async (table) => {
        try {
          await retryOperation(async () => {
            const { error } = await supabase
              .from(table)
              .select('count')
              .limit(1);

            if (error) {
              throw error;
            }
          }, 1, 500); // Shorter retry for health check

          tableStatus[table] = true;
        } catch (error) {
          console.warn(`Health check failed for table ${table}:`, error);
          tableStatus[table] = false;
          overallHealth = false;
        }
      })
    );

    // Test visitor_scans table
    try {
      await retryOperation(async () => {
        const { error } = await supabase
          .from('visitor_scans')
          .select('count')
          .limit(1);

        if (error) {
          throw error;
        }
      }, 1, 500);
      
      tableStatus['visitor_scans'] = true;
    } catch (error) {
      console.warn('Health check failed for visitor_scans table:', error);
      tableStatus['visitor_scans'] = false;
      overallHealth = false;
      healthError = 'Scan tracking system unavailable';
    }

  } catch (error) {
    overallHealth = false;
    healthError = `Database health check failed: ${error.message}`;
  }

  return {
    isHealthy: overallHealth,
    tables: tableStatus,
    error: healthError
  };
}
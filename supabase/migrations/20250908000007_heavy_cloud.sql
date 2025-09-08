/*
  # Add visitor name to scan records

  1. Schema Changes
    - Add `visitor_name` column to `visitor_scans` table
    - Update existing records with visitor names from their respective tables
    - Add index for better query performance

  2. Data Migration
    - Populate existing scan records with visitor names
    - Handle all visitor types (visitors, professional_visitors, press, etc.)

  3. Performance
    - Add index on visitor_name for faster searches
*/

-- Add visitor_name column to visitor_scans table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitor_scans' AND column_name = 'visitor_name'
  ) THEN
    ALTER TABLE visitor_scans ADD COLUMN visitor_name text;
  END IF;
END $$;

-- Update existing records with visitor names from visitors table
UPDATE visitor_scans 
SET visitor_name = v.full_name
FROM visitors v
WHERE visitor_scans.visitor_id = v.id 
  AND visitor_scans.visitor_type = 'visitors'
  AND visitor_scans.visitor_name IS NULL;

-- Update existing records with visitor names from professional_visitors table
UPDATE visitor_scans 
SET visitor_name = pv.full_name
FROM professional_visitors pv
WHERE visitor_scans.visitor_id = pv.id 
  AND visitor_scans.visitor_type = 'professional_visitors'
  AND visitor_scans.visitor_name IS NULL;

-- Update existing records with visitor names from press table
UPDATE visitor_scans 
SET visitor_name = p.full_name
FROM press p
WHERE visitor_scans.visitor_id = p.id 
  AND visitor_scans.visitor_type = 'press'
  AND visitor_scans.visitor_name IS NULL;

-- Update existing records with visitor names from exhibitors table
UPDATE visitor_scans 
SET visitor_name = e.full_name
FROM exhibitors e
WHERE visitor_scans.visitor_id = e.id 
  AND visitor_scans.visitor_type = 'exhibitors'
  AND visitor_scans.visitor_name IS NULL;

-- Update existing records with visitor names from staff table
UPDATE visitor_scans 
SET visitor_name = s.full_name
FROM staff s
WHERE visitor_scans.visitor_id = s.id 
  AND visitor_scans.visitor_type = 'staff'
  AND visitor_scans.visitor_name IS NULL;

-- Update existing records with visitor names from conference table
UPDATE visitor_scans 
SET visitor_name = c.full_name
FROM conference c
WHERE visitor_scans.visitor_id = c.id 
  AND visitor_scans.visitor_type = 'conference'
  AND visitor_scans.visitor_name IS NULL;

-- Update existing records with visitor names from organisateurs table
UPDATE visitor_scans 
SET visitor_name = o.full_name
FROM organisateurs o
WHERE visitor_scans.visitor_id = o.id 
  AND visitor_scans.visitor_type = 'organisateurs'
  AND visitor_scans.visitor_name IS NULL;

-- Update existing records with visitor names from vip table
UPDATE visitor_scans 
SET visitor_name = vip.full_name
FROM vip
WHERE visitor_scans.visitor_id = vip.id 
  AND visitor_scans.visitor_type = 'vip'
  AND visitor_scans.visitor_name IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_visitor_scans_visitor_name ON visitor_scans (visitor_name);

-- Add index for combined queries
CREATE INDEX IF NOT EXISTS idx_visitor_scans_name_type_date ON visitor_scans (visitor_name, visitor_type, scan_date);
/*
  # Add scan tracking functionality

  1. New Tables
    - `visitor_scans`
      - `id` (uuid, primary key)
      - `visitor_id` (uuid, references visitor)
      - `visitor_type` (text, indicates which table the visitor is from)
      - `scanned_at` (timestamp)
      - `scan_date` (date, for daily grouping)

  2. Security
    - Enable RLS on `visitor_scans` table
    - Add policies for public read and insert

  3. Indexes
    - Add indexes for efficient querying by visitor, date, and type
*/

CREATE TABLE IF NOT EXISTS visitor_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL,
  visitor_type text NOT NULL,
  scanned_at timestamptz DEFAULT now(),
  scan_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE visitor_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for visitor scans"
  ON visitor_scans
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert for visitor scans"
  ON visitor_scans
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_visitor_scans_visitor_id ON visitor_scans (visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_scans_visitor_type ON visitor_scans (visitor_type);
CREATE INDEX IF NOT EXISTS idx_visitor_scans_scan_date ON visitor_scans (scan_date);
CREATE INDEX IF NOT EXISTS idx_visitor_scans_scanned_at ON visitor_scans (scanned_at);
CREATE INDEX IF NOT EXISTS idx_visitor_scans_composite ON visitor_scans (visitor_id, visitor_type, scan_date);
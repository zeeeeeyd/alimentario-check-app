/*
  # QR Scanner Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `qr_code` (text, unique) - The QR code identifier
      - `name` (text) - User's full name
      - `email` (text) - User's email address
      - `phone` (text, optional) - User's phone number
      - `created_at` (timestamp) - When user was registered
      - `updated_at` (timestamp) - Last profile update

    - `visits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `visit_date` (date) - The date of visit
      - `visit_count` (integer) - Number of visits on this date
      - `first_visit_time` (timestamp) - Time of first visit on this date
      - `last_visit_time` (timestamp) - Time of most recent visit
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated access
    - Create indexes for performance

  3. Functions
    - Function to increment visit count or create new visit record
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code text UNIQUE NOT NULL,
  name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create visits table
CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  visit_date date NOT NULL,
  visit_count integer DEFAULT 1,
  first_visit_time timestamptz DEFAULT now(),
  last_visit_time timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, visit_date)
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Allow all operations on users for authenticated users"
  ON users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for visits table  
CREATE POLICY "Allow all operations on visits for authenticated users"
  ON visits
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_qr_code ON users(qr_code);
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_user_date ON visits(user_id, visit_date);

-- Function to handle visit tracking
CREATE OR REPLACE FUNCTION record_visit(user_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  visit_record visits%ROWTYPE;
  today_date date := CURRENT_DATE;
BEGIN
  -- Try to get existing visit record for today
  SELECT * INTO visit_record
  FROM visits 
  WHERE user_id = user_uuid AND visit_date = today_date;
  
  IF FOUND THEN
    -- Update existing visit record
    UPDATE visits 
    SET 
      visit_count = visit_count + 1,
      last_visit_time = now(),
      updated_at = now()
    WHERE user_id = user_uuid AND visit_date = today_date
    RETURNING * INTO visit_record;
  ELSE
    -- Create new visit record
    INSERT INTO visits (user_id, visit_date, visit_count, first_visit_time, last_visit_time)
    VALUES (user_uuid, today_date, 1, now(), now())
    RETURNING * INTO visit_record;
  END IF;
  
  RETURN json_build_object(
    'visit_count', visit_record.visit_count,
    'visit_date', visit_record.visit_date,
    'first_visit_time', visit_record.first_visit_time,
    'last_visit_time', visit_record.last_visit_time
  );
END;
$$;
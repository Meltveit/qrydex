-- Update RLS policies to allow anon inserts for crawler

-- Drop existing policy
DROP POLICY IF EXISTS "Service role full access" ON businesses;

-- Create new policy that allows both service_role and anon to insert
CREATE POLICY "Allow inserts for service and anon" ON businesses
  FOR INSERT 
  USING (true);

-- Keep read policy
-- CREATE POLICY "Public read access" ON businesses FOR SELECT USING (true);

-- Allow anon updates too
CREATE POLICY "Allow updates for service and anon" ON businesses
  FOR UPDATE
  USING (true);

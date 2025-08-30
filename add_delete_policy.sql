-- Add Delete Policy for Teams
-- Run this in your Supabase SQL Editor

-- Add delete policy for teams (if it doesn't exist)
DROP POLICY IF EXISTS "Users can delete their own teams" ON teams;

CREATE POLICY "Users can delete their own teams" ON teams
  FOR DELETE USING (owner_id = auth.uid());

-- Test the policy
SELECT 'Delete policy added successfully!' as status;
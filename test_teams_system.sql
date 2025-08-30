-- Test Teams System
-- Run this in your Supabase SQL Editor to verify everything is working

-- 1. Check if user is authenticated
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_user_email;

-- 2. Check if tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('teams', 'team_members', 'team_invitations', 'team_activities');

-- 3. Check RLS policies
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename IN ('teams', 'team_members', 'team_invitations', 'team_activities')
ORDER BY tablename, policyname;

-- 4. Test team creation (this should work if everything is set up correctly)
INSERT INTO teams (name, description, owner_id) 
VALUES ('Test Team ' || now(), 'Test Description', auth.uid())
RETURNING id, name, owner_id;

-- 5. Check if team was created
SELECT * FROM teams WHERE owner_id = auth.uid() ORDER BY created_at DESC LIMIT 5;

-- 6. Test adding a team member
WITH latest_team AS (
  SELECT id FROM teams WHERE owner_id = auth.uid() ORDER BY created_at DESC LIMIT 1
)
INSERT INTO team_members (team_id, user_id, role, status)
SELECT id, auth.uid(), 'owner', 'active' FROM latest_team
RETURNING *;

-- 7. Check team members
SELECT 
  tm.*,
  t.name as team_name
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
WHERE tm.user_id = auth.uid();

-- 8. Clean up test data (optional)
-- DELETE FROM team_members WHERE team_id IN (SELECT id FROM teams WHERE name LIKE 'Test Team%');
-- DELETE FROM teams WHERE name LIKE 'Test Team%';
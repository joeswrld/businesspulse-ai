-- Debug Teams RLS Policies
-- Run this in your Supabase SQL Editor to test the teams system

-- Check if tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('teams', 'team_members', 'team_invitations', 'team_activities');

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('teams', 'team_members', 'team_invitations', 'team_activities');

-- Check current user
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_user_email;

-- Test basic queries (run these as the authenticated user)
-- 1. Test teams table access
SELECT * FROM teams LIMIT 5;

-- 2. Test team_members table access
SELECT * FROM team_members LIMIT 5;

-- 3. Test team_invitations table access
SELECT * FROM team_invitations LIMIT 5;

-- 4. Test team_activities table access
SELECT * FROM team_activities LIMIT 5;

-- Check if user can create a team (this should work if user is authenticated)
-- INSERT INTO teams (name, description, owner_id) VALUES ('Test Team', 'Test Description', auth.uid());

-- Check team creation permissions
SELECT 
  has_table_privilege(auth.uid(), 'teams', 'INSERT') as can_insert_teams,
  has_table_privilege(auth.uid(), 'teams', 'SELECT') as can_select_teams,
  has_table_privilege(auth.uid(), 'team_members', 'INSERT') as can_insert_members,
  has_table_privilege(auth.uid(), 'team_members', 'SELECT') as can_select_members;
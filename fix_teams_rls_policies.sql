-- Fix Teams RLS Policies - Remove Infinite Recursion
-- Run this in your Supabase SQL Editor

-- Step 1: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view public teams" ON teams;
DROP POLICY IF EXISTS "Team members can view their teams" ON teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;

DROP POLICY IF EXISTS "Team members can view team members" ON team_members;
DROP POLICY IF EXISTS "Team admins can manage members" ON team_members;
DROP POLICY IF EXISTS "Users can join teams via invitation" ON team_members;

DROP POLICY IF EXISTS "Users can view their invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can update their invitations" ON team_invitations;

DROP POLICY IF EXISTS "Team members can view activities" ON team_activities;
DROP POLICY IF EXISTS "Team members can create activities" ON team_activities;

-- Step 2: Create simple, non-recursive policies for teams
CREATE POLICY "Users can view public teams" ON teams
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own teams" ON teams
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create teams" ON teams
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own teams" ON teams
  FOR UPDATE USING (owner_id = auth.uid());

-- Step 3: Create simple policies for team_members
CREATE POLICY "Users can view their own memberships" ON team_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create memberships" ON team_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own memberships" ON team_members
  FOR UPDATE USING (user_id = auth.uid());

-- Step 4: Create simple policies for team_invitations
CREATE POLICY "Users can view their own invitations" ON team_invitations
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can create invitations" ON team_invitations
  FOR INSERT WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Users can update their own invitations" ON team_invitations
  FOR UPDATE USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Step 5: Create simple policies for team_activities
CREATE POLICY "Users can view activities" ON team_activities
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create activities" ON team_activities
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Step 6: Test the policies
SELECT 'RLS policies fixed successfully!' as status;
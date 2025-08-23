-- Fix for Team Invitation Permission Issues
-- This script fixes the RLS policies that are preventing invitation creation

-- First, let's check the current team_members table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'team_members' 
ORDER BY ordinal_position;

-- Check current team_members data for the current user
-- Replace 'your-user-id' with the actual user ID
SELECT 
    tm.*,
    t.name as team_name,
    t.owner_id
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
WHERE tm.user_id = auth.uid();

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Team owners and admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can view team invitations" ON team_invitations;

-- Create a more permissive policy for team owners
CREATE POLICY "Team owners can create invitations" ON team_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM teams 
            WHERE teams.id = team_invitations.team_id 
            AND teams.owner_id = auth.uid()
        )
        AND inviter_id = auth.uid()
    );

-- Create a policy for team admins and owners
CREATE POLICY "Team admins and owners can create invitations" ON team_invitations
    FOR INSERT WITH CHECK (
        (
            EXISTS (
                SELECT 1 FROM teams 
                WHERE teams.id = team_invitations.team_id 
                AND teams.owner_id = auth.uid()
            )
            OR
            EXISTS (
                SELECT 1 FROM team_members 
                WHERE team_id = team_invitations.team_id 
                AND user_id = auth.uid() 
                AND role IN ('owner', 'admin')
            )
        )
        AND inviter_id = auth.uid()
    );

-- Create a policy for viewing team invitations
CREATE POLICY "Team members can view team invitations" ON team_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = team_invitations.team_id 
            AND user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM teams 
            WHERE teams.id = team_invitations.team_id 
            AND teams.owner_id = auth.uid()
        )
    );

-- Create a fallback policy for team owners (in case team_members table is missing data)
CREATE POLICY "Team owners fallback policy" ON team_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM teams 
            WHERE teams.id = team_invitations.team_id 
            AND teams.owner_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON team_invitations TO authenticated;

-- Show current policies
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
WHERE tablename = 'team_invitations'
ORDER BY policyname;
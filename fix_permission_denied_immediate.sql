-- Immediate Fix for "Permission Denied" Error
-- This script specifically addresses the admin rights issue

-- Step 1: Check current user's team memberships
SELECT '=== CURRENT USER TEAM MEMBERSHIPS ===' as info;

SELECT 
    tm.team_id,
    t.name as team_name,
    tm.role,
    tm.status,
    CASE 
        WHEN t.owner_id = tm.user_id THEN 'Team Owner'
        ELSE 'Team Member'
    END as ownership_status
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
WHERE tm.user_id = auth.uid()
ORDER BY t.name;

-- Step 2: Check if team owners are missing from team_members table
SELECT '=== MISSING TEAM OWNERS ===' as info;

SELECT 
    t.id as team_id,
    t.name as team_name,
    t.owner_id,
    CASE 
        WHEN tm.user_id IS NOT NULL THEN '✅ Owner is team member'
        ELSE '❌ Owner missing from team_members'
    END as membership_status
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id AND t.owner_id = tm.user_id
WHERE tm.user_id IS NULL
ORDER BY t.name;

-- Step 3: Add missing team owners to team_members table
INSERT INTO team_members (team_id, user_id, role, status, permissions, joined_at)
SELECT 
    t.id,
    t.owner_id,
    'owner',
    'active',
    ARRAY['all'],
    NOW()
FROM teams t
WHERE NOT EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = t.id AND tm.user_id = t.owner_id
);

-- Step 4: Update any existing team members with 'owner' role to ensure consistency
UPDATE team_members 
SET role = 'owner', permissions = ARRAY['all']
WHERE user_id IN (
    SELECT owner_id FROM teams
) 
AND role != 'owner';

-- Step 5: Drop ALL existing RLS policies to start completely fresh
DROP POLICY IF EXISTS "Users can view invitations they sent" ON team_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can view team invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can accept/decline invitations sent to them" ON team_invitations;
DROP POLICY IF EXISTS "Team members can view team invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners fallback policy" ON team_invitations;
DROP POLICY IF EXISTS "Team owners can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team admins can create invitations" ON team_invitations;

-- Step 6: Create a simple, permissive policy for team owners
CREATE POLICY "Team owners can create invitations" ON team_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM teams 
            WHERE teams.id = team_invitations.team_id 
            AND teams.owner_id = auth.uid()
        )
        AND inviter_id = auth.uid()
    );

-- Step 7: Create a policy for team admins
CREATE POLICY "Team admins can create invitations" ON team_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = team_invitations.team_id 
            AND user_id = auth.uid() 
            AND role IN ('admin')
        )
        AND inviter_id = auth.uid()
    );

-- Step 8: Create basic viewing policies
CREATE POLICY "Users can view invitations they sent" ON team_invitations
    FOR SELECT USING (inviter_id = auth.uid());

CREATE POLICY "Users can view invitations sent to their email" ON team_invitations
    FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

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

-- Step 9: Create update policies
CREATE POLICY "Users can update their own invitations" ON team_invitations
    FOR UPDATE USING (inviter_id = auth.uid());

CREATE POLICY "Users can accept/decline invitations sent to them" ON team_invitations
    FOR UPDATE USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Step 10: Grant permissions
GRANT ALL ON team_invitations TO authenticated;

-- Step 11: Show verification results
SELECT '=== VERIFICATION: TEAM OWNERSHIP AFTER FIX ===' as info;

SELECT 
    t.id as team_id,
    t.name as team_name,
    t.owner_id,
    CASE 
        WHEN tm.user_id IS NOT NULL THEN '✅ Owner is team member'
        ELSE '❌ Owner missing from team_members'
    END as membership_status
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id AND t.owner_id = tm.user_id
ORDER BY t.name;

SELECT '=== VERIFICATION: CURRENT USER TEAM MEMBERSHIPS ===' as info;

SELECT 
    tm.team_id,
    t.name as team_name,
    tm.role,
    tm.status,
    CASE 
        WHEN t.owner_id = tm.user_id THEN 'Team Owner'
        ELSE 'Team Member'
    END as ownership_status
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
WHERE tm.user_id = auth.uid()
ORDER BY t.name;

SELECT '=== VERIFICATION: RLS POLICIES ===' as info;

SELECT 
    policyname,
    cmd,
    CASE 
        WHEN with_check IS NOT NULL THEN 'INSERT/UPDATE Policy'
        ELSE 'SELECT Policy'
    END as policy_type
FROM pg_policies 
WHERE tablename = 'team_invitations'
ORDER BY policyname;
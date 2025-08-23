-- Comprehensive Fix for Team Invitation Permission Denied Error (Fixed Version)
-- This script fixes both team membership and RLS policy issues

-- Step 1: Ensure team owners are properly added as team members
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

-- Step 2: Update any existing team members with 'owner' role to ensure consistency
UPDATE team_members 
SET role = 'owner', permissions = ARRAY['all']
WHERE user_id IN (
    SELECT owner_id FROM teams
) 
AND role != 'owner';

-- Step 3: Drop ALL existing RLS policies to start fresh
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

-- Step 4: Create comprehensive RLS policies that work for all scenarios

-- Policy 1: Team owners can always create invitations (primary check)
CREATE POLICY "Team owners can create invitations" ON team_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM teams 
            WHERE teams.id = team_invitations.team_id 
            AND teams.owner_id = auth.uid()
        )
        AND inviter_id = auth.uid()
    );

-- Policy 2: Team admins can create invitations (secondary check)
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

-- Policy 3: Users can view invitations they sent
CREATE POLICY "Users can view invitations they sent" ON team_invitations
    FOR SELECT USING (inviter_id = auth.uid());

-- Policy 4: Users can view invitations sent to their email
CREATE POLICY "Users can view invitations sent to their email" ON team_invitations
    FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Policy 5: Team members can view team invitations
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

-- Policy 6: Users can update their own invitations
CREATE POLICY "Users can update their own invitations" ON team_invitations
    FOR UPDATE USING (inviter_id = auth.uid());

-- Policy 7: Users can accept/decline invitations sent to them
CREATE POLICY "Users can accept/decline invitations sent to them" ON team_invitations
    FOR UPDATE USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Step 5: Grant necessary permissions
GRANT ALL ON team_invitations TO authenticated;

-- Step 6: Show diagnostic information
SELECT '=== TEAM OWNERSHIP CHECK ===' as info;

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

SELECT '=== RLS POLICIES ===' as info;

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
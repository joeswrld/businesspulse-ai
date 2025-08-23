-- Enhanced Team Invitation System for Company Collaboration
-- This script ensures the invitation system works perfectly for company team management

-- Step 1: Ensure all required columns exist
ALTER TABLE team_invitations 
ADD COLUMN IF NOT EXISTS token VARCHAR(255) UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS personal_message TEXT,
ADD COLUMN IF NOT EXISTS inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Update existing records
UPDATE team_invitations 
SET 
    token = encode(gen_random_bytes(32), 'hex'),
    expires_at = NOW() + INTERVAL '7 days',
    inviter_id = (
        SELECT owner_id 
        FROM teams 
        WHERE teams.id = team_invitations.team_id
    )
WHERE token IS NULL OR inviter_id IS NULL;

-- Step 3: Make required columns NOT NULL
ALTER TABLE team_invitations 
ALTER COLUMN inviter_id SET NOT NULL,
ALTER COLUMN token SET NOT NULL,
ALTER COLUMN expires_at SET NOT NULL;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON team_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_team_invitations_inviter_id ON team_invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);

-- Step 5: Update constraints for proper role validation
ALTER TABLE team_invitations 
DROP CONSTRAINT IF EXISTS team_invitations_status_check;

ALTER TABLE team_invitations 
ADD CONSTRAINT team_invitations_status_check 
CHECK (status IN ('pending', 'accepted', 'declined', 'expired'));

ALTER TABLE team_invitations 
DROP CONSTRAINT IF EXISTS team_invitations_role_check;

ALTER TABLE team_invitations 
ADD CONSTRAINT team_invitations_role_check 
CHECK (role IN ('member', 'admin', 'moderator'));

-- Step 6: Ensure team owners are team members
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

-- Step 7: Update team member roles for consistency
UPDATE team_members 
SET role = 'owner', permissions = ARRAY['all']
WHERE user_id IN (
    SELECT owner_id FROM teams
) 
AND role != 'owner';

-- Step 8: Enable Row Level Security
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Step 9: Drop existing policies and create comprehensive ones
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

-- Step 10: Create comprehensive RLS policies for company collaboration

-- Policy 1: Team owners can create invitations (primary check)
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

-- Step 11: Grant permissions
GRANT ALL ON team_invitations TO authenticated;

-- Step 12: Create function to clean expired invitations
CREATE OR REPLACE FUNCTION clean_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE team_invitations 
    SET status = 'expired' 
    WHERE expires_at < NOW() AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Step 13: Create function to get invitation statistics
CREATE OR REPLACE FUNCTION get_team_invitation_stats(team_uuid UUID)
RETURNS TABLE(
    total_invitations BIGINT,
    pending_invitations BIGINT,
    accepted_invitations BIGINT,
    declined_invitations BIGINT,
    expired_invitations BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_invitations,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_invitations,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted_invitations,
        COUNT(*) FILTER (WHERE status = 'declined') as declined_invitations,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_invitations
    FROM team_invitations 
    WHERE team_id = team_uuid;
END;
$$ LANGUAGE plpgsql;

-- Step 14: Show diagnostic information
SELECT '=== TEAM INVITATION SYSTEM STATUS ===' as info;

SELECT 
    t.id as team_id,
    t.name as team_name,
    t.owner_id,
    CASE 
        WHEN tm.user_id IS NOT NULL THEN '✅ Owner is team member'
        ELSE '❌ Owner missing from team_members'
    END as membership_status,
    (SELECT COUNT(*) FROM team_invitations ti WHERE ti.team_id = t.id) as total_invitations
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id AND t.owner_id = tm.user_id
ORDER BY t.name;

SELECT '=== INVITATION ROLE DISTRIBUTION ===' as info;

SELECT 
    role,
    COUNT(*) as invitation_count,
    status,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
    COUNT(*) FILTER (WHERE status = 'declined') as declined
FROM team_invitations 
GROUP BY role, status
ORDER BY role, status;

SELECT '=== RLS POLICIES STATUS ===' as info;

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
-- Complete Fix for Team Invitation System
-- This script fixes all potential issues with the team_invitations table

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 1: Ensure team_invitations table exists with all required columns
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator')),
    personal_message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    token VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    declined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add missing columns to existing table (if table already exists)
ALTER TABLE team_invitations 
ADD COLUMN IF NOT EXISTS token VARCHAR(255) UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS personal_message TEXT,
ADD COLUMN IF NOT EXISTS inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Update existing records to have required values
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

-- Step 4: Make required columns NOT NULL
ALTER TABLE team_invitations 
ALTER COLUMN inviter_id SET NOT NULL,
ALTER COLUMN token SET NOT NULL,
ALTER COLUMN expires_at SET NOT NULL;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON team_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_team_invitations_inviter_id ON team_invitations(inviter_id);

-- Step 6: Update constraints
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

-- Step 7: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger for updated_at
DROP TRIGGER IF EXISTS update_team_invitations_updated_at ON team_invitations;
CREATE TRIGGER update_team_invitations_updated_at
    BEFORE UPDATE ON team_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_team_invitations_updated_at();

-- Step 9: Enable Row Level Security
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Step 10: Drop existing policies and recreate them
DROP POLICY IF EXISTS "Users can view invitations they sent" ON team_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can view team invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can accept/decline invitations sent to them" ON team_invitations;

-- Step 11: Create comprehensive RLS policies
-- Users can view invitations they sent
CREATE POLICY "Users can view invitations they sent" ON team_invitations
    FOR SELECT USING (inviter_id = auth.uid());

-- Users can view invitations sent to their email
CREATE POLICY "Users can view invitations sent to their email" ON team_invitations
    FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Team owners and admins can view team invitations
CREATE POLICY "Team owners and admins can view team invitations" ON team_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = team_invitations.team_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Team owners and admins can create invitations
CREATE POLICY "Team owners and admins can create invitations" ON team_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = team_invitations.team_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
        AND inviter_id = auth.uid()
    );

-- Users can update their own invitations
CREATE POLICY "Users can update their own invitations" ON team_invitations
    FOR UPDATE USING (inviter_id = auth.uid());

-- Users can accept/decline invitations sent to them
CREATE POLICY "Users can accept/decline invitations sent to them" ON team_invitations
    FOR UPDATE USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Step 12: Grant necessary permissions
GRANT ALL ON team_invitations TO authenticated;
GRANT USAGE ON SEQUENCE team_invitations_id_seq TO authenticated;

-- Step 13: Create function to clean expired invitations
CREATE OR REPLACE FUNCTION clean_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE team_invitations 
    SET status = 'expired' 
    WHERE expires_at < NOW() AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Step 14: Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'team_invitations' 
ORDER BY ordinal_position;

-- Step 15: Show current policies
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
WHERE tablename = 'team_invitations';
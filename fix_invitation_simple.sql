-- Simple Fix for Team Invitation System
-- This script adds missing columns and fixes RLS policies without sequence issues

-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add missing columns to team_invitations table
ALTER TABLE team_invitations 
ADD COLUMN IF NOT EXISTS token VARCHAR(255) UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS personal_message TEXT,
ADD COLUMN IF NOT EXISTS inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing records to have required values
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

-- Make required columns NOT NULL after setting default values
ALTER TABLE team_invitations 
ALTER COLUMN inviter_id SET NOT NULL,
ALTER COLUMN token SET NOT NULL,
ALTER COLUMN expires_at SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON team_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_team_invitations_inviter_id ON team_invitations(inviter_id);

-- Update constraints
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

-- Enable Row Level Security
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view invitations they sent" ON team_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can view team invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can accept/decline invitations sent to them" ON team_invitations;

-- Create essential RLS policies
CREATE POLICY "Users can view invitations they sent" ON team_invitations
    FOR SELECT USING (inviter_id = auth.uid());

CREATE POLICY "Users can view invitations sent to their email" ON team_invitations
    FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Team owners and admins can view team invitations" ON team_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = team_invitations.team_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

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

CREATE POLICY "Users can update their own invitations" ON team_invitations
    FOR UPDATE USING (inviter_id = auth.uid());

CREATE POLICY "Users can accept/decline invitations sent to them" ON team_invitations
    FOR UPDATE USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Grant permissions
GRANT ALL ON team_invitations TO authenticated;

-- Show the updated table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'team_invitations' 
ORDER BY ordinal_position;
-- Immediate fix for team_invitations table
-- Run this in Supabase SQL Editor to fix the missing columns

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
WHERE token IS NULL;

-- Make columns NOT NULL after setting default values
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
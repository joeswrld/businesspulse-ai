-- Team Invitations System Migration
-- This creates a complete invitation system with email tracking

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create team_invitations table with enhanced fields
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON team_invitations(expires_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_team_invitations_updated_at
    BEFORE UPDATE ON team_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_team_invitations_updated_at();

-- Create function to clean expired invitations
CREATE OR REPLACE FUNCTION clean_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE team_invitations 
    SET status = 'expired' 
    WHERE expires_at < NOW() AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to clean expired invitations (runs every hour)
CREATE OR REPLACE FUNCTION schedule_clean_expired_invitations()
RETURNS void AS $$
BEGIN
    PERFORM clean_expired_invitations();
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_invitations
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

CREATE POLICY "Team owners and admins can delete team invitations" ON team_invitations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = team_invitations.team_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Create function to handle invitation acceptance
CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_token TEXT)
RETURNS JSON AS $$
DECLARE
    invitation_record team_invitations%ROWTYPE;
    user_email TEXT;
    result JSON;
BEGIN
    -- Get user email
    SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
    
    -- Get invitation
    SELECT * INTO invitation_record 
    FROM team_invitations 
    WHERE token = invitation_token 
    AND email = user_email 
    AND status = 'pending' 
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Check if user is already a member
    IF EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id = invitation_record.team_id 
        AND user_id = auth.uid()
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already a member of this team');
    END IF;
    
    -- Add user to team
    INSERT INTO team_members (team_id, user_id, role, joined_at)
    VALUES (invitation_record.team_id, auth.uid(), invitation_record.role, NOW());
    
    -- Update invitation status
    UPDATE team_invitations 
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = invitation_record.id;
    
    RETURN json_build_object('success', true, 'message', 'Invitation accepted successfully');
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle invitation decline
CREATE OR REPLACE FUNCTION decline_team_invitation(invitation_token TEXT)
RETURNS JSON AS $$
DECLARE
    invitation_record team_invitations%ROWTYPE;
    user_email TEXT;
BEGIN
    -- Get user email
    SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
    
    -- Get invitation
    SELECT * INTO invitation_record 
    FROM team_invitations 
    WHERE token = invitation_token 
    AND email = user_email 
    AND status = 'pending' 
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Update invitation status
    UPDATE team_invitations 
    SET status = 'declined', declined_at = NOW()
    WHERE id = invitation_record.id;
    
    RETURN json_build_object('success', true, 'message', 'Invitation declined successfully');
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get invitation details
CREATE OR REPLACE FUNCTION get_invitation_details(invitation_token TEXT)
RETURNS JSON AS $$
DECLARE
    invitation_data JSON;
BEGIN
    SELECT json_build_object(
        'id', ti.id,
        'team_id', ti.team_id,
        'team_name', t.name,
        'team_description', t.description,
        'inviter_email', u.email,
        'inviter_name', u.raw_user_meta_data->>'full_name',
        'email', ti.email,
        'role', ti.role,
        'personal_message', ti.personal_message,
        'status', ti.status,
        'expires_at', ti.expires_at,
        'created_at', ti.created_at
    ) INTO invitation_data
    FROM team_invitations ti
    JOIN teams t ON ti.team_id = t.id
    JOIN auth.users u ON ti.inviter_id = u.id
    WHERE ti.token = invitation_token;
    
    RETURN COALESCE(invitation_data, json_build_object('error', 'Invitation not found'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for invitation statistics
CREATE OR REPLACE VIEW team_invitation_stats AS
SELECT 
    team_id,
    COUNT(*) as total_invitations,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_invitations,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted_invitations,
    COUNT(*) FILTER (WHERE status = 'declined') as declined_invitations,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_invitations
FROM team_invitations
GROUP BY team_id;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON team_invitations TO authenticated;
GRANT ALL ON team_invitation_stats TO authenticated;
GRANT EXECUTE ON FUNCTION accept_team_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_team_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_details(TEXT) TO authenticated;

-- Insert sample data for testing (optional)
-- INSERT INTO team_invitations (team_id, inviter_id, email, role, personal_message)
-- VALUES (
--     (SELECT id FROM teams LIMIT 1),
--     (SELECT id FROM auth.users LIMIT 1),
--     'test@example.com',
--     'member',
--     'Welcome to our team! We are excited to have you join us.'
-- );

COMMENT ON TABLE team_invitations IS 'Team invitation system with email tracking and role management';
COMMENT ON FUNCTION accept_team_invitation(TEXT) IS 'Accept a team invitation by token';
COMMENT ON FUNCTION decline_team_invitation(TEXT) IS 'Decline a team invitation by token';
COMMENT ON FUNCTION get_invitation_details(TEXT) IS 'Get invitation details by token';
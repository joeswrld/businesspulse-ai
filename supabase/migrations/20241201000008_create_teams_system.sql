-- NoteX Teams System - Lovable Ready
-- Run this in your Supabase SQL Editor

-- 1. Create teams table for team management
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create team_members table for team membership
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('invited', 'active', 'suspended')) DEFAULT 'invited',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 3. Create team_invitations table for pending invites
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create team_projects table for collaborative work
CREATE TABLE IF NOT EXISTS team_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'archived', 'completed')) DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  due_date TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create team_insights table for shared AI insights
CREATE TABLE IF NOT EXISTS team_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  key_findings TEXT[] NOT NULL DEFAULT '{}',
  recommendations TEXT[] NOT NULL DEFAULT '{}',
  projected_impact TEXT,
  tags TEXT[] DEFAULT '{}',
  source TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'approved', 'implemented')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create team_reports table for collaborative reporting
CREATE TABLE IF NOT EXISTS team_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('PDF', 'CSV', 'XLSX', 'Dashboard')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'approved', 'published')) DEFAULT 'draft',
  file_url TEXT,
  file_size BIGINT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create team_activities table for activity tracking
CREATE TABLE IF NOT EXISTS team_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires ON team_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_team_projects_team_id ON team_projects(team_id);
CREATE INDEX IF NOT EXISTS idx_team_projects_status ON team_projects(status);
CREATE INDEX IF NOT EXISTS idx_team_projects_assigned ON team_projects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_team_insights_team_id ON team_insights(team_id);
CREATE INDEX IF NOT EXISTS idx_team_insights_category ON team_insights(category);
CREATE INDEX IF NOT EXISTS idx_team_insights_status ON team_insights(status);
CREATE INDEX IF NOT EXISTS idx_team_reports_team_id ON team_reports(team_id);
CREATE INDEX IF NOT EXISTS idx_team_reports_type ON team_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_team_reports_status ON team_reports(status);
CREATE INDEX IF NOT EXISTS idx_team_activities_team_id ON team_activities(team_id);
CREATE INDEX IF NOT EXISTS idx_team_activities_user_id ON team_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_team_activities_created_at ON team_activities(created_at);

-- 9. Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activities ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for security
-- Teams: users can see teams they're members of
CREATE POLICY "teams_member_view" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = id AND user_id = auth.uid() AND status = 'active'
    )
  );

-- Teams: owners can manage their teams
CREATE POLICY "teams_owner_manage" ON teams
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Team members: users can see members of teams they're in
CREATE POLICY "team_members_view" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

-- Team members: admins and owners can manage members
CREATE POLICY "team_members_manage" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() 
      AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
    )
  );

-- Team invitations: team admins can manage
CREATE POLICY "team_invitations_manage" ON team_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() 
      AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
    )
  );

-- Team projects: team members can view, creators can manage
CREATE POLICY "team_projects_view" ON team_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY "team_projects_manage" ON team_projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.status = 'active'
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() 
      AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
    )
  );

-- Team insights: team members can view, creators can manage
CREATE POLICY "team_insights_view" ON team_insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY "team_insights_manage" ON team_insights
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.status = 'active'
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() 
      AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
    )
  );

-- Team reports: team members can view, creators can manage
CREATE POLICY "team_reports_view" ON team_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY "team_reports_manage" ON team_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.status = 'active'
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() 
      AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
    )
  );

-- Team activities: team members can view
CREATE POLICY "team_activities_view" ON team_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

-- 11. Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE team_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE team_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE team_insights;
ALTER PUBLICATION supabase_realtime ADD TABLE team_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE team_activities;

-- 12. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create triggers for updated_at
CREATE TRIGGER trigger_update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_team_projects_updated_at
  BEFORE UPDATE ON team_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_team_insights_updated_at
  BEFORE UPDATE ON team_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_team_reports_updated_at
  BEFORE UPDATE ON team_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 14. Create function to log team activities
CREATE OR REPLACE FUNCTION log_team_activity(
  p_team_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO team_activities (
    team_id, user_id, action, entity_type, entity_id, details
  ) VALUES (
    p_team_id, p_user_id, p_action, p_entity_type, p_entity_id, p_details
  );
END;
$$ LANGUAGE plpgsql;

-- 15. Create function to get user's teams
CREATE OR REPLACE FUNCTION get_user_teams(p_user_id UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  user_role TEXT,
  member_status TEXT,
  team_created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.slug as team_slug,
    tm.role as user_role,
    tm.status as member_status,
    t.created_at as team_created_at
  FROM teams t
  INNER JOIN team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = p_user_id AND tm.status = 'active'
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 16. Insert sample team for testing (optional - remove in production)
INSERT INTO teams (name, description, owner_id, slug) VALUES
  ('NoteX Core Team', 'Core development and product team', 
   (SELECT id FROM auth.users LIMIT 1), 'notex-core')
ON CONFLICT (slug) DO NOTHING;

-- Success message
SELECT 'NoteX Teams system created successfully!' as status;
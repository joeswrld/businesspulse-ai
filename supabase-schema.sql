-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '8 days'),
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'failed', 'cancelled')),
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  paystack_customer_code TEXT,
  paystack_subscription_code TEXT,
  paystack_authorization_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  widget_color TEXT DEFAULT '#3B82F6',
  widget_logo_url TEXT,
  widget_greeting TEXT DEFAULT 'How can we help you today?',
  widget_position TEXT DEFAULT 'bottom-right',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  type TEXT DEFAULT 'other' CHECK (type IN ('bug', 'feature', 'praise', 'other')),
  user_name TEXT,
  user_email TEXT,
  user_ip TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  ai_summary TEXT,
  suggested_reply TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'archived')),
  assigned_to UUID REFERENCES profiles(id),
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_feedback', 'team_invite', 'payment_failed', 'trial_ending')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_logs table
CREATE TABLE IF NOT EXISTS payment_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  paystack_reference TEXT,
  amount DECIMAL(10,2),
  status TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_feedback_workspace_id ON feedback(workspace_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_team_members_workspace_id ON team_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON payment_logs(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they own or are members of" ON workspaces
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    auth.uid() IN (SELECT user_id FROM team_members WHERE workspace_id = workspaces.id)
  );

CREATE POLICY "Users can update workspaces they own" ON workspaces
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert workspaces they own" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- RLS Policies for feedback
CREATE POLICY "Users can view feedback from their workspaces" ON feedback
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE owner_id = auth.uid() 
      OR id IN (SELECT workspace_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert feedback to their workspaces" ON feedback
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE owner_id = auth.uid() 
      OR id IN (SELECT workspace_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update feedback in their workspaces" ON feedback
  FOR UPDATE USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE owner_id = auth.uid() 
      OR id IN (SELECT workspace_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- RLS Policies for team_members
CREATE POLICY "Users can view team members of their workspaces" ON team_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE owner_id = auth.uid() 
      OR id IN (SELECT workspace_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Workspace owners can manage team members" ON team_members
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for payment_logs
CREATE POLICY "Users can view own payment logs" ON payment_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert payment logs" ON payment_logs
  FOR INSERT WITH CHECK (true);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Onboarding tracking schema
-- This file contains the database schema for Phase 3 onboarding features

-- Onboarding checklist tracking
CREATE TABLE IF NOT EXISTS onboarding_checklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_id VARCHAR(50) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, step_id)
);

-- Onboarding progress tracking
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_steps INTEGER DEFAULT 0,
  completed_steps INTEGER DEFAULT 0,
  current_step VARCHAR(50),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Default branding options for projects
ALTER TABLE feedback_settings 
ADD COLUMN IF NOT EXISTS default_branding JSONB DEFAULT '{}';

-- Demo project seeding flag
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS demo_data_seeded BOOLEAN DEFAULT FALSE;

-- Onboarding checklist steps definition
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  order_index INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default onboarding steps
INSERT INTO onboarding_steps (id, title, description, icon, order_index) VALUES
('install_widget', 'Install Widget', 'Add the feedback widget to your website', 'code', 1),
('get_first_feedback', 'Get First Feedback', 'Receive your first piece of feedback', 'message-square', 2),
('generate_insight', 'Generate AI Insight', 'Create your first AI-powered insight', 'sparkles', 3),
('customize_branding', 'Customize Branding', 'Set up your widget colors and branding', 'palette', 4),
('invite_team', 'Invite Team Members', 'Add team members to collaborate', 'users', 5)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for onboarding tables
ALTER TABLE onboarding_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

-- Policies for onboarding_checklist
CREATE POLICY "Users can view their own onboarding checklist" ON onboarding_checklist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding checklist" ON onboarding_checklist
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding checklist" ON onboarding_checklist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for onboarding_progress
CREATE POLICY "Users can view their own onboarding progress" ON onboarding_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding progress" ON onboarding_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding progress" ON onboarding_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for onboarding_steps (public read)
CREATE POLICY "Anyone can view onboarding steps" ON onboarding_steps
  FOR SELECT USING (true);

-- Function to initialize onboarding for new users
CREATE OR REPLACE FUNCTION initialize_user_onboarding(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  step_record RECORD;
BEGIN
  -- Initialize onboarding progress
  INSERT INTO onboarding_progress (user_id, total_steps, completed_steps, current_step)
  SELECT p_user_id, COUNT(*), 0, 'install_widget'
  FROM onboarding_steps
  WHERE is_active = true
  ON CONFLICT (user_id) DO NOTHING;

  -- Initialize checklist items for all active steps
  FOR step_record IN 
    SELECT id FROM onboarding_steps WHERE is_active = true ORDER BY order_index
  LOOP
    INSERT INTO onboarding_checklist (user_id, step_id)
    VALUES (p_user_id, step_record.id)
    ON CONFLICT (user_id, step_id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update onboarding progress
CREATE OR REPLACE FUNCTION update_onboarding_progress(p_user_id UUID, p_step_id VARCHAR(50))
RETURNS VOID AS $$
DECLARE
  total_steps INTEGER;
  completed_count INTEGER;
  next_step VARCHAR(50);
BEGIN
  -- Mark step as completed
  UPDATE onboarding_checklist 
  SET completed = TRUE, completed_at = NOW(), updated_at = NOW()
  WHERE user_id = p_user_id AND step_id = p_step_id;

  -- Get total and completed counts
  SELECT COUNT(*) INTO total_steps FROM onboarding_steps WHERE is_active = true;
  
  SELECT COUNT(*) INTO completed_count 
  FROM onboarding_checklist 
  WHERE user_id = p_user_id AND completed = TRUE;

  -- Find next step
  SELECT id INTO next_step
  FROM onboarding_steps 
  WHERE is_active = true 
    AND id NOT IN (
      SELECT step_id FROM onboarding_checklist 
      WHERE user_id = p_user_id AND completed = TRUE
    )
  ORDER BY order_index 
  LIMIT 1;

  -- Update progress
  UPDATE onboarding_progress 
  SET 
    completed_steps = completed_count,
    current_step = COALESCE(next_step, 'completed'),
    is_completed = (completed_count >= total_steps),
    completed_at = CASE WHEN completed_count >= total_steps THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to seed demo data for new users
CREATE OR REPLACE FUNCTION seed_demo_data(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  demo_project_id UUID;
  demo_feedback_ids UUID[] := '{}';
  i INTEGER;
BEGIN
  -- Check if demo data already seeded
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = p_user_id AND demo_data_seeded = TRUE) THEN
    RETURN;
  END IF;

  -- Generate a demo project ID
  demo_project_id := gen_random_uuid();

  -- Create demo feedback entries
  INSERT INTO feedback (id, project_id, email, message, page_url, browser, sentiment, created_at) VALUES
  (gen_random_uuid(), demo_project_id, 'demo@example.com', 'This is amazing! The interface is so intuitive and easy to use. I love how everything is organized.', '/dashboard', 'Chrome', 'positive', NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), demo_project_id, 'user@test.com', 'Great product! The analytics dashboard gives me exactly the insights I need to improve my business.', '/analytics', 'Firefox', 'positive', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), demo_project_id, 'feedback@demo.com', 'The widget integration was super easy. Took me just 5 minutes to set up!', '/settings', 'Safari', 'positive', NOW() - INTERVAL '12 hours'),
  (gen_random_uuid(), demo_project_id, 'test@example.com', 'I wish there were more customization options for the widget appearance.', '/feedback', 'Chrome', 'negative', NOW() - INTERVAL '6 hours'),
  (gen_random_uuid(), demo_project_id, 'demo@user.com', 'The AI insights feature is really helpful for understanding customer sentiment.', '/insights', 'Edge', 'positive', NOW() - INTERVAL '3 hours'),
  (gen_random_uuid(), demo_project_id, 'user@demo.com', 'Could use better documentation for the API endpoints.', '/docs', 'Chrome', 'neutral', NOW() - INTERVAL '1 hour'),
  (gen_random_uuid(), demo_project_id, 'feedback@test.com', 'Love the real-time updates! Makes monitoring feedback so much easier.', '/dashboard', 'Firefox', 'positive', NOW() - INTERVAL '30 minutes'),
  (gen_random_uuid(), demo_project_id, 'demo@feedback.com', 'The team collaboration features are exactly what we needed for our workflow.', '/teams', 'Safari', 'positive', NOW() - INTERVAL '15 minutes')
  RETURNING id INTO demo_feedback_ids;

  -- Create demo insights
  INSERT INTO insights_results (id, user_id, file_id, file_name, summary, key_themes, suggested_actions, sentiment, performance, trends, created_at) VALUES
  (gen_random_uuid(), p_user_id, demo_project_id::text, 'demo_feedback_analysis', 
   'Based on the feedback analysis, users are generally very satisfied with the platform. The most common themes include ease of use, intuitive interface, and helpful AI insights. However, there are some requests for more customization options and better documentation.',
   ARRAY['Ease of Use', 'Interface Design', 'AI Insights', 'Customization', 'Documentation'],
   ARRAY['Add more widget customization options', 'Improve API documentation', 'Consider adding video tutorials'],
   '{"positive": 0.75, "negative": 0.15, "neutral": 0.10}',
   '{"response_time": "excellent", "usability": "high", "satisfaction": "very_high"}',
   ARRAY['Increasing user satisfaction', 'Growing demand for customization', 'Positive feedback on AI features'],
   NOW() - INTERVAL '1 hour');

  -- Update feedback settings with demo project
  INSERT INTO feedback_settings (user_id, project_id, widget_title, widget_color, greeting_text, default_branding)
  VALUES (p_user_id, demo_project_id, 'Share your feedback with us!', '#3B82F6', 'Welcome, tell us what''s on your mind', '{"logo_url": null, "primary_color": "#3B82F6", "secondary_color": "#1E40AF"}')
  ON CONFLICT (user_id) DO UPDATE SET
    project_id = demo_project_id,
    default_branding = EXCLUDED.default_branding;

  -- Mark demo data as seeded
  UPDATE profiles 
  SET demo_data_seeded = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize onboarding for new users
CREATE OR REPLACE FUNCTION handle_new_user_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize onboarding
  PERFORM initialize_user_onboarding(NEW.id);
  
  -- Seed demo data
  PERFORM seed_demo_data(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_onboarding();
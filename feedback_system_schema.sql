-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  form_type text NOT NULL CHECK (form_type IN ('customer_satisfaction', 'product_feedback')),
  message text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create feedback_settings table for widget configuration
CREATE TABLE IF NOT EXISTS feedback_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  customer_satisfaction_enabled boolean DEFAULT true,
  product_feedback_enabled boolean DEFAULT true,
  widget_title text DEFAULT 'We love your feedback!',
  widget_color text DEFAULT '#3B82F6',
  greeting_text text DEFAULT 'Help us improve by sharing your thoughts',
  widget_position text DEFAULT 'bottom-right',
  show_branding boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS and create policies
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for feedback
CREATE POLICY "Users can view their project feedback" ON feedback
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can insert feedback" ON feedback
  FOR INSERT WITH CHECK (true);

-- RLS policies for feedback_settings  
CREATE POLICY "Users can manage their feedback settings" ON feedback_settings
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_form_type ON feedback(form_type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
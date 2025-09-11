-- ========================================
-- PERFORMANCE OPTIMIZATION: ADD MISSING INDEXES
-- ========================================

-- Indexes for profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_status ON profiles(plan_status);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expiry ON profiles(trial_expiry_date);

-- Indexes for billing_profiles table
CREATE INDEX IF NOT EXISTS idx_billing_profiles_id ON billing_profiles(id);
CREATE INDEX IF NOT EXISTS idx_billing_profiles_plan ON billing_profiles(plan);
CREATE INDEX IF NOT EXISTS idx_billing_profiles_status ON billing_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_billing_profiles_trial_ends ON billing_profiles(trial_ends_at);

-- Indexes for feedbacks table
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_id ON feedbacks(project_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at);
CREATE INDEX IF NOT EXISTS idx_feedbacks_sentiment ON feedbacks(sentiment);

-- Indexes for projects table
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_project_id ON projects(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);

-- Indexes for subscriptions table
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_code ON subscriptions(plan_code);

-- Indexes for usage_tracking table
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_updated_at ON usage_tracking(updated_at);

-- Indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_profiles_plan_status_active ON profiles(plan_status) WHERE plan_status = 'active';
CREATE INDEX IF NOT EXISTS idx_billing_profiles_trial_active ON billing_profiles(plan, subscription_status) WHERE plan = 'trial' AND subscription_status = 'trial';
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_created ON feedbacks(project_id, created_at);

-- Add comments for documentation
COMMENT ON INDEX idx_profiles_user_id IS 'Index for fast user lookups in profiles table';
COMMENT ON INDEX idx_billing_profiles_id IS 'Index for fast billing profile lookups';
COMMENT ON INDEX idx_feedbacks_project_id IS 'Index for fast feedback queries by project';
COMMENT ON INDEX idx_projects_user_id IS 'Index for fast project queries by user';
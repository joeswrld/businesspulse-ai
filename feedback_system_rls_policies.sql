-- ============================================================================
-- FEEDBACK SYSTEM RLS POLICIES
-- ============================================================================
-- This file contains Row Level Security policies for the feedback system
-- to ensure users can only access their own data.

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROJECTS TABLE POLICIES
-- ============================================================================

-- Users can only view their own projects
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (user_id = auth.uid());

-- Users can only insert their own projects
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only update their own projects
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (user_id = auth.uid());

-- Users can only delete their own projects
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- FEEDBACK TABLE POLICIES
-- ============================================================================

-- Users can only view feedback for their own projects
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Anyone can insert feedback (for public forms)
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.feedback;
CREATE POLICY "Anyone can insert feedback" ON public.feedback
  FOR INSERT WITH CHECK (true);

-- Users can only update feedback for their own projects
DROP POLICY IF EXISTS "Users can update own feedback" ON public.feedback;
CREATE POLICY "Users can update own feedback" ON public.feedback
  FOR UPDATE USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Users can only delete feedback for their own projects
DROP POLICY IF EXISTS "Users can delete own feedback" ON public.feedback;
CREATE POLICY "Users can delete own feedback" ON public.feedback
  FOR DELETE USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- ============================================================================
-- FEEDBACK_SETTINGS TABLE POLICIES
-- ============================================================================

-- Users can only view settings for their own projects
DROP POLICY IF EXISTS "Users can view own settings" ON public.feedback_settings;
CREATE POLICY "Users can view own settings" ON public.feedback_settings
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Users can only insert settings for their own projects
DROP POLICY IF EXISTS "Users can insert own settings" ON public.feedback_settings;
CREATE POLICY "Users can insert own settings" ON public.feedback_settings
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Users can only update settings for their own projects
DROP POLICY IF EXISTS "Users can update own settings" ON public.feedback_settings;
CREATE POLICY "Users can update own settings" ON public.feedback_settings
  FOR UPDATE USING (
    user_id = auth.uid() AND
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Users can only delete settings for their own projects
DROP POLICY IF EXISTS "Users can delete own settings" ON public.feedback_settings;
CREATE POLICY "Users can delete own settings" ON public.feedback_settings
  FOR DELETE USING (
    user_id = auth.uid() AND
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- ============================================================================
-- SUBSCRIPTIONS TABLE POLICIES (if not already exists)
-- ============================================================================

-- Enable RLS on subscriptions table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions' AND table_schema = 'public') THEN
        ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
        
        -- Users can only view their own subscriptions
        DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
        CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
          FOR SELECT USING (user_id = auth.uid());
        
        -- Users can only insert their own subscriptions
        DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
        CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions
          FOR INSERT WITH CHECK (user_id = auth.uid());
        
        -- Users can only update their own subscriptions
        DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
        CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
          FOR UPDATE USING (user_id = auth.uid());
        
        -- Users can only delete their own subscriptions
        DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscriptions;
        CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions
          FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- ============================================================================
-- PROFILES TABLE POLICIES (if not already exists)
-- ============================================================================

-- Enable RLS on profiles table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- Users can only view their own profile
        DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
        CREATE POLICY "Users can view own profile" ON public.profiles
          FOR SELECT USING (user_id = auth.uid());
        
        -- Users can only insert their own profile
        DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
        CREATE POLICY "Users can insert own profile" ON public.profiles
          FOR INSERT WITH CHECK (user_id = auth.uid());
        
        -- Users can only update their own profile
        DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
        CREATE POLICY "Users can update own profile" ON public.profiles
          FOR UPDATE USING (user_id = auth.uid());
        
        -- Users can only delete their own profile
        DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
        CREATE POLICY "Users can delete own profile" ON public.profiles
          FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('projects', 'feedback', 'feedback_settings', 'subscriptions', 'profiles')
ORDER BY tablename;

-- Verify policies exist
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
WHERE schemaname = 'public' 
  AND tablename IN ('projects', 'feedback', 'feedback_settings', 'subscriptions', 'profiles')
ORDER BY tablename, policyname;
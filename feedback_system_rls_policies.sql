-- ============================================================================
-- FEEDBACK SYSTEM RLS POLICIES - FIXED VERSION
-- ============================================================================
-- This file contains Row Level Security policies for the feedback system
-- to ensure users can only access their own data.

-- First, let's check the actual table structures and fix any missing columns
DO $$
BEGIN
    -- Add user_id to feedback_settings if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feedback_settings' 
        AND column_name = 'user_id' 
        AND table_schema = 'public'
    ) THEN
        -- Add user_id column to feedback_settings
        ALTER TABLE public.feedback_settings 
        ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
        
        -- Update existing records to set user_id based on project ownership
        UPDATE public.feedback_settings 
        SET user_id = (
            SELECT p.user_id 
            FROM public.projects p 
            WHERE p.id = feedback_settings.project_id
        );
        
        -- Make user_id NOT NULL after updating existing records
        ALTER TABLE public.feedback_settings 
        ALTER COLUMN user_id SET NOT NULL;
        
        RAISE NOTICE 'Added user_id column to feedback_settings table';
    END IF;
    
    -- Add user_id to profiles if it doesn't exist (and table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'user_id' 
            AND table_schema = 'public'
        ) THEN
            -- Check if profiles table uses 'id' instead of 'user_id'
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'profiles' 
                AND column_name = 'id' 
                AND table_schema = 'public'
            ) THEN
                RAISE NOTICE 'Profiles table uses id column instead of user_id';
            ELSE
                ALTER TABLE public.profiles 
                ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
                RAISE NOTICE 'Added user_id column to profiles table';
            END IF;
        END IF;
    END IF;
    
    -- Add user_id to subscriptions if it doesn't exist (and table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'subscriptions' 
            AND column_name = 'user_id' 
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.subscriptions 
            ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added user_id column to subscriptions table';
        END IF;
    END IF;
END $$;

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
  FOR SELECT USING (user_id = auth.uid());

-- Users can only insert settings for their own projects
DROP POLICY IF EXISTS "Users can insert own settings" ON public.feedback_settings;
CREATE POLICY "Users can insert own settings" ON public.feedback_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only update settings for their own projects
DROP POLICY IF EXISTS "Users can update own settings" ON public.feedback_settings;
CREATE POLICY "Users can update own settings" ON public.feedback_settings
  FOR UPDATE USING (user_id = auth.uid());

-- Users can only delete settings for their own projects
DROP POLICY IF EXISTS "Users can delete own settings" ON public.feedback_settings;
CREATE POLICY "Users can delete own settings" ON public.feedback_settings
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- SUBSCRIPTIONS TABLE POLICIES (if table exists)
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
        
        RAISE NOTICE 'RLS policies created for subscriptions table';
    ELSE
        RAISE NOTICE 'Subscriptions table does not exist, skipping policies';
    END IF;
END $$;

-- ============================================================================
-- PROFILES TABLE POLICIES (if table exists)
-- ============================================================================

-- Handle profiles table policies based on column structure
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- Check if profiles table uses 'id' or 'user_id'
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'user_id' 
            AND table_schema = 'public'
        ) THEN
            -- Profiles table has user_id column
            DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
            CREATE POLICY "Users can view own profile" ON public.profiles
              FOR SELECT USING (user_id = auth.uid());
            
            DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
            CREATE POLICY "Users can insert own profile" ON public.profiles
              FOR INSERT WITH CHECK (user_id = auth.uid());
            
            DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
            CREATE POLICY "Users can update own profile" ON public.profiles
              FOR UPDATE USING (user_id = auth.uid());
            
            DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
            CREATE POLICY "Users can delete own profile" ON public.profiles
              FOR DELETE USING (user_id = auth.uid());
              
            RAISE NOTICE 'RLS policies created for profiles table using user_id column';
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'id' 
            AND table_schema = 'public'
        ) THEN
            -- Profiles table uses 'id' as the user reference
            DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
            CREATE POLICY "Users can view own profile" ON public.profiles
              FOR SELECT USING (id = auth.uid());
            
            DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
            CREATE POLICY "Users can insert own profile" ON public.profiles
              FOR INSERT WITH CHECK (id = auth.uid());
            
            DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
            CREATE POLICY "Users can update own profile" ON public.profiles
              FOR UPDATE USING (id = auth.uid());
            
            DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
            CREATE POLICY "Users can delete own profile" ON public.profiles
              FOR DELETE USING (id = auth.uid());
              
            RAISE NOTICE 'RLS policies created for profiles table using id column';
        ELSE
            RAISE NOTICE 'Profiles table exists but no suitable user reference column found';
        END IF;
    ELSE
        RAISE NOTICE 'Profiles table does not exist, skipping policies';
    END IF;
END $$;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes to improve RLS policy performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON public.feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_settings_user_id ON public.feedback_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_settings_project_id ON public.feedback_settings(project_id);

-- Create indexes for subscriptions and profiles if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'user_id' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
        END IF;
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
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('projects', 'feedback', 'feedback_settings', 'subscriptions', 'profiles')
ORDER BY tablename, policyname;

-- Check table columns to verify structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('projects', 'feedback', 'feedback_settings', 'subscriptions', 'profiles')
  AND column_name IN ('id', 'user_id', 'project_id')
ORDER BY table_name, column_name;

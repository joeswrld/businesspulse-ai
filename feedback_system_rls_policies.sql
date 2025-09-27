-- ============================================================================
-- FEEDBACK SYSTEM RLS POLICIES - CLEAN VERSION
-- ============================================================================

DO $$
BEGIN
    -- Add user_id to feedback_settings if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feedback_settings' 
          AND column_name = 'user_id' 
          AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.feedback_settings 
        ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

        UPDATE public.feedback_settings fs
        SET user_id = p.user_id
        FROM public.projects p
        WHERE p.id = fs.project_id;

        ALTER TABLE public.feedback_settings 
        ALTER COLUMN user_id SET NOT NULL;

        RAISE NOTICE 'Added user_id column to feedback_settings';
    END IF;

    -- Add user_id to subscriptions if missing
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'subscriptions' 
              AND column_name = 'user_id'
        ) THEN
            ALTER TABLE public.subscriptions 
            ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added user_id column to subscriptions';
        END IF;
    END IF;

    -- Add user_id to profiles if needed
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
              AND column_name = 'user_id'
        ) THEN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'profiles' AND column_name = 'id'
            ) THEN
                RAISE NOTICE 'Profiles table uses id instead of user_id';
            ELSE
                ALTER TABLE public.profiles 
                ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
                RAISE NOTICE 'Added user_id column to profiles';
            END IF;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROJECTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- FEEDBACK POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.feedback;
CREATE POLICY "Anyone can insert feedback" ON public.feedback
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own feedback" ON public.feedback;
CREATE POLICY "Users can update own feedback" ON public.feedback
  FOR UPDATE USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own feedback" ON public.feedback;
CREATE POLICY "Users can delete own feedback" ON public.feedback
  FOR DELETE USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- ============================================================================
-- FEEDBACK SETTINGS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own settings" ON public.feedback_settings;
CREATE POLICY "Users can view own settings" ON public.feedback_settings
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own settings" ON public.feedback_settings;
CREATE POLICY "Users can insert own settings" ON public.feedback_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own settings" ON public.feedback_settings;
CREATE POLICY "Users can update own settings" ON public.feedback_settings
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own settings" ON public.feedback_settings;
CREATE POLICY "Users can delete own settings" ON public.feedback_settings
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- SUBSCRIPTIONS POLICIES
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
        CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
          FOR SELECT USING (user_id = auth.uid());

        DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
        CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions
          FOR INSERT WITH CHECK (user_id = auth.uid());

        DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
        CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
          FOR UPDATE USING (user_id = auth.uid());

        DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscriptions;
        CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions
          FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'user_id'
        ) THEN
            -- Profiles table uses user_id
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
        ELSE
            -- Profiles table uses id
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
        END IF;
    END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON public.feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_settings_user_id ON public.feedback_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_settings_project_id ON public.feedback_settings(project_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
        ELSE
            CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
        END IF;
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('projects','feedback','feedback_settings','subscriptions','profiles');

SELECT schemaname, tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('projects','feedback','feedback_settings','subscriptions','profiles')
ORDER BY tablename, policyname;

-- ============================================================================
-- VERIFY SIGNUP FIX - Check if the fix was applied correctly
-- ============================================================================

-- Check if the profiles table has all required columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name IN ('id', 'user_id', 'email', 'full_name', 'company_name', 'email_confirmed', 'trial_start', 'trial_end')
ORDER BY column_name;

-- Check if the trigger functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN ('handle_new_user', 'handle_email_confirmation')
ORDER BY routine_name;

-- Check if triggers are created
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'auth' 
    AND event_object_table = 'users'
    AND trigger_name IN ('on_auth_user_created', 'on_auth_user_email_confirmed')
ORDER BY trigger_name;

-- Check for any profiles with null or empty company_name
SELECT 
    COUNT(*) as profiles_with_invalid_company_name
FROM public.profiles 
WHERE company_name IS NULL OR TRIM(company_name) = '';

-- Check total profiles vs users
SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM public.profiles) as total_profiles,
    (SELECT COUNT(*) FROM public.profiles WHERE email_confirmed = true) as confirmed_profiles;

-- Check recent profiles (last 24 hours)
SELECT 
    id,
    email,
    full_name,
    company_name,
    email_confirmed,
    created_at
FROM public.profiles 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- Check for any constraint violations
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass
    AND conname LIKE '%company_name%';

-- Final status check
DO $$
DECLARE
    profile_count INTEGER;
    user_count INTEGER;
    invalid_company_count INTEGER;
    trigger_count INTEGER;
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO invalid_company_count FROM public.profiles WHERE company_name IS NULL OR TRIM(company_name) = '';
    SELECT COUNT(*) INTO trigger_count FROM information_schema.triggers WHERE trigger_schema = 'auth' AND event_object_table = 'users';
    SELECT COUNT(*) INTO function_count FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('handle_new_user', 'handle_email_confirmation');
    
    RAISE NOTICE '=== SIGNUP FIX VERIFICATION ===';
    RAISE NOTICE 'Total users: %', user_count;
    RAISE NOTICE 'Total profiles: %', profile_count;
    RAISE NOTICE 'Profiles with invalid company_name: %', invalid_company_count;
    RAISE NOTICE 'Auth triggers: %', trigger_count;
    RAISE NOTICE 'Trigger functions: %', function_count;
    
    IF profile_count = user_count AND invalid_company_count = 0 AND trigger_count >= 2 AND function_count = 2 THEN
        RAISE NOTICE '✅ SIGNUP FIX VERIFICATION PASSED - All checks passed!';
    ELSE
        RAISE NOTICE '❌ SIGNUP FIX VERIFICATION FAILED - Some checks failed!';
        IF profile_count != user_count THEN
            RAISE NOTICE '   - Profile count (%%) does not match user count (%%)', profile_count, user_count;
        END IF;
        IF invalid_company_count > 0 THEN
            RAISE NOTICE '   - Found %% profiles with invalid company_name', invalid_company_count;
        END IF;
        IF trigger_count < 2 THEN
            RAISE NOTICE '   - Expected 2+ auth triggers, found %%', trigger_count;
        END IF;
        IF function_count < 2 THEN
            RAISE NOTICE '   - Expected 2 trigger functions, found %%', function_count;
        END IF;
    END IF;
END
$$;

SELECT 'Signup fix verification completed!' AS status;
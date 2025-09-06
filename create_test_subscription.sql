-- Create a test subscription for testing the Usage Overview
-- This ensures we have real subscription data to test with

-- First, let's see if we have any users
SELECT 
    id,
    email,
    created_at
FROM auth.users 
LIMIT 3;

-- Create a test subscription for the first user (if any exist)
DO $$
DECLARE
    test_user_id UUID;
    subscription_exists BOOLEAN;
BEGIN
    -- Get the first user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Found user: %', test_user_id;
        
        -- Check if subscription already exists
        SELECT EXISTS(
            SELECT 1 FROM subscriptions WHERE user_id = test_user_id
        ) INTO subscription_exists;
        
        IF NOT subscription_exists THEN
            -- Create a test subscription
            INSERT INTO subscriptions (
                user_id,
                plan_type,
                renewal_date,
                trial_start,
                trial_end,
                is_active
            ) VALUES (
                test_user_id,
                'trial',
                NULL,
                NOW() - INTERVAL '2 days',
                NOW() + INTERVAL '6 days',
                true
            );
            
            RAISE NOTICE '✓ Created trial subscription for user: %', test_user_id;
        ELSE
            RAISE NOTICE '✓ Subscription already exists for user: %', test_user_id;
        END IF;
        
        -- Show the subscription data
        SELECT 
            user_id,
            plan_type,
            renewal_date,
            trial_start,
            trial_end,
            is_active,
            created_at
        FROM subscriptions 
        WHERE user_id = test_user_id;
        
    ELSE
        RAISE NOTICE '⚠ No users found in auth.users table';
        RAISE NOTICE 'Please create a user first or check your authentication setup';
    END IF;
END $$;

-- Show all subscriptions
SELECT 
    s.user_id,
    u.email,
    s.plan_type,
    s.renewal_date,
    s.trial_start,
    s.trial_end,
    s.is_active,
    s.created_at
FROM subscriptions s
LEFT JOIN auth.users u ON s.user_id = u.id
ORDER BY s.created_at DESC;
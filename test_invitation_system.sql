-- Test Script: Verify Invitation System is Working
-- Run this after applying the emergency fix

-- Test 1: Check if we can insert an invitation (this should work now)
SELECT '=== TEST 1: INSERTING TEST INVITATION ===' as info;

-- Try to insert a test invitation
INSERT INTO team_invitations (
    team_id,
    inviter_id,
    email,
    role,
    personal_message,
    status,
    token,
    expires_at
) 
SELECT 
    t.id as team_id,
    t.owner_id as inviter_id,
    'test@example.com' as email,
    'member' as role,
    'Test invitation' as personal_message,
    'pending' as status,
    encode(gen_random_bytes(32), 'hex') as token,
    NOW() + INTERVAL '7 days' as expires_at
FROM teams t
WHERE t.owner_id = auth.uid()
LIMIT 1
RETURNING id, team_id, email, role, status;

-- Test 2: Check if we can read invitations
SELECT '=== TEST 2: READING INVITATIONS ===' as info;

SELECT 
    id,
    team_id,
    email,
    role,
    status,
    created_at
FROM team_invitations 
WHERE inviter_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- Test 3: Check team memberships
SELECT '=== TEST 3: TEAM MEMBERSHIPS ===' as info;

SELECT 
    tm.team_id,
    t.name as team_name,
    tm.role,
    tm.status,
    CASE 
        WHEN t.owner_id = tm.user_id THEN 'Team Owner'
        ELSE 'Team Member'
    END as ownership_status
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
WHERE tm.user_id = auth.uid()
ORDER BY t.name;

-- Test 4: Check table permissions
SELECT '=== TEST 4: TABLE PERMISSIONS ===' as info;

SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.role_table_grants 
WHERE table_name IN ('team_invitations', 'team_members', 'teams')
AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

-- Test 5: Clean up test invitation
SELECT '=== TEST 5: CLEANING UP TEST INVITATION ===' as info;

DELETE FROM team_invitations 
WHERE email = 'test@example.com' 
AND inviter_id = auth.uid()
RETURNING id, email;

SELECT '=== TEST COMPLETE ===' as info;
SELECT 'If you see this message and no errors above, the invitation system is working!' as status;
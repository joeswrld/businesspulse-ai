-- Fix for Team Membership Issues
-- This script ensures team owners are properly added as team members

-- First, let's check if team owners are missing from team_members table
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.owner_id,
    tm.user_id as member_user_id,
    tm.role as member_role
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id AND t.owner_id = tm.user_id
WHERE tm.user_id IS NULL;

-- Add missing team owners to team_members table
INSERT INTO team_members (team_id, user_id, role, status, permissions, joined_at)
SELECT 
    t.id,
    t.owner_id,
    'owner',
    'active',
    ARRAY['all'],
    NOW()
FROM teams t
WHERE NOT EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = t.id AND tm.user_id = t.owner_id
);

-- Verify the fix
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.owner_id,
    tm.user_id as member_user_id,
    tm.role as member_role,
    tm.status as member_status
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id AND t.owner_id = tm.user_id
ORDER BY t.name;

-- Update any existing team members with 'owner' role to ensure consistency
UPDATE team_members 
SET role = 'owner', permissions = ARRAY['all']
WHERE user_id IN (
    SELECT owner_id FROM teams
) 
AND role != 'owner';

-- Show current team memberships for debugging
SELECT 
    tm.team_id,
    t.name as team_name,
    tm.user_id,
    tm.role,
    tm.status,
    tm.permissions,
    CASE 
        WHEN t.owner_id = tm.user_id THEN 'Team Owner'
        ELSE 'Team Member'
    END as ownership_status
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
ORDER BY t.name, tm.role DESC, tm.user_id;
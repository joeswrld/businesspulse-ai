-- Check existing database objects to diagnose conflicts
-- Run this in your Supabase SQL Editor to see what already exists

-- Check existing tables
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('usage_counters', 'plans', 'qr_links', 'email_links')
ORDER BY table_name;

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('usage_counters', 'plans', 'qr_links', 'email_links')
ORDER BY tablename, policyname;

-- Check existing triggers
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers 
WHERE event_object_table IN ('usage_counters', 'plans', 'qr_links', 'email_links')
ORDER BY event_object_table, trigger_name;

-- Check existing functions
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%usage%' OR routine_name LIKE '%plan%'
ORDER BY routine_name;
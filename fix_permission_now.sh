#!/bin/bash

# Immediate Fix for Permission Denied Error
# This script helps you apply the fix for the admin rights issue

echo "🚨 IMMEDIATE FIX FOR PERMISSION DENIED ERROR"
echo ""

echo "The 'Permission denied: you may not have admin rights' error occurs because:"
echo "1. Team owners are not properly added to the team_members table"
echo "2. RLS policies are not recognizing team ownership correctly"
echo "3. There's a mismatch between teams.owner_id and team_members.user_id"
echo ""

echo "🔧 This fix will:"
echo "✅ Check your current team memberships"
echo "✅ Add missing team owners to team_members table"
echo "✅ Fix RLS policies to properly recognize team ownership"
echo "✅ Show verification results to confirm the fix worked"
echo ""

echo "📝 Copy and paste this SQL into your Supabase SQL Editor:"
echo ""

# Display the SQL content
cat fix_permission_denied_immediate.sql

echo ""
echo "▶️  Click 'Run' to execute the SQL"
echo ""

echo "🔍 After running the SQL, check the results:"
echo "1. Look for '✅ Owner is team member' in the verification results"
echo "2. Make sure your user ID appears in the team memberships"
echo "3. Verify that RLS policies are created correctly"
echo ""

echo "🎯 If you still get permission errors after this fix:"
echo "1. Check the verification results in the SQL output"
echo "2. Make sure you're the owner of the team you're trying to invite to"
echo "3. Try refreshing the page and logging out/in again"
echo "4. Check the browser console for any additional error messages"
echo ""

echo "✅ This fix should resolve the permission denied error immediately!"
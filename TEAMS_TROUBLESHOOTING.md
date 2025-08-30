# 🔧 Teams System Troubleshooting Guide

## 🚨 **Common Issues & Solutions**

### **Issue 1: "Failed to create Team" Error**

**Symptoms:**
- Popup shows "Failed to create Team"
- Team creation dialog closes without success
- No team appears in the list

**Possible Causes:**
1. **RLS Policy Issues**: User doesn't have permission to create teams
2. **Database Connection**: Supabase connection problems
3. **Invalid Data**: Missing required fields or invalid data types
4. **Foreign Key Constraints**: Issues with user_id reference

**Solutions:**

**Step 1: Check Database Connection**
```sql
-- Run in Supabase SQL Editor
SELECT auth.uid() as current_user_id, auth.email() as current_user_email;
```

**Step 2: Test Team Creation Permissions**
```sql
-- Check if user can insert into teams table
SELECT has_table_privilege(auth.uid(), 'teams', 'INSERT') as can_insert_teams;
```

**Step 3: Verify RLS Policies**
```sql
-- Check teams table policies
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'teams';
```

**Step 4: Test Manual Team Creation**
```sql
-- Try creating a team manually
INSERT INTO teams (name, description, owner_id) 
VALUES ('Test Team', 'Test Description', auth.uid())
RETURNING *;
```

### **Issue 2: "Failed to load teams data" Error**

**Symptoms:**
- Teams page shows loading spinner indefinitely
- Popup shows "Failed to load teams data"
- No teams displayed

**Possible Causes:**
1. **RLS Policy Restrictions**: User can't access any teams
2. **Query Errors**: Complex joins or invalid queries
3. **Authentication Issues**: User not properly authenticated
4. **Database Schema**: Missing tables or columns

**Solutions:**

**Step 1: Check Authentication**
```javascript
// In browser console, check if user is authenticated
console.log('User:', user);
console.log('User ID:', user?.id);
```

**Step 2: Test Basic Queries**
```sql
-- Test basic teams query
SELECT * FROM teams WHERE owner_id = auth.uid();

-- Test team members query
SELECT * FROM team_members WHERE user_id = auth.uid();
```

**Step 3: Check Table Structure**
```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('teams', 'team_members');
```

**Step 4: Test RLS Policies**
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('teams', 'team_members');
```

## 🔍 **Debugging Steps**

### **Step 1: Enable Debug Mode**
1. Open the Teams page
2. Click the "Debug DB" button
3. Check browser console for detailed error messages
4. Look for specific error codes and messages

### **Step 2: Check Browser Console**
```javascript
// Look for these error patterns:
// - "Teams error: ..."
// - "Members error: ..."
// - "Invitations error: ..."
// - "Team creation error: ..."
```

### **Step 3: Verify Database Schema**
Run this SQL to check your database:
```sql
-- Check if all tables exist
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('teams', 'team_members', 'team_invitations', 'team_activities')
ORDER BY table_name, ordinal_position;
```

### **Step 4: Test RLS Policies**
```sql
-- Check all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('teams', 'team_members', 'team_invitations', 'team_activities');
```

## 🛠️ **Quick Fixes**

### **Fix 1: Reset RLS Policies**
```sql
-- Drop and recreate RLS policies for teams
DROP POLICY IF EXISTS "Users can create teams" ON teams;
CREATE POLICY "Users can create teams" ON teams
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Team members can view their teams" ON teams;
CREATE POLICY "Team members can view their teams" ON teams
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = teams.id 
      AND team_members.user_id = auth.uid()
    )
  );
```

### **Fix 2: Simplify Team Loading**
```javascript
// Replace the complex loadTeams function with this simpler version:
const loadTeams = async () => {
  if (!user) return;
  
  try {
    // Simple query for owned teams
    const { data: ownedTeams, error: ownedError } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', user.id);
    
    if (ownedError) throw ownedError;
    
    setTeams(ownedTeams || []);
  } catch (error) {
    console.error('Error loading teams:', error);
    toast.error('Failed to load teams data');
  }
};
```

### **Fix 3: Test Team Creation**
```javascript
// Simple team creation test
const testCreateTeam = async () => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: 'Test Team',
        description: 'Test Description',
        owner_id: user.id
      })
      .select()
      .single();
    
    console.log('Team creation result:', { data, error });
  } catch (error) {
    console.error('Team creation failed:', error);
  }
};
```

## 📋 **Common Error Messages**

### **Error: "new row violates row-level security policy"**
**Solution:** Check RLS policies and ensure user has proper permissions

### **Error: "column does not exist"**
**Solution:** Verify database schema matches the expected structure

### **Error: "foreign key constraint fails"**
**Solution:** Ensure referenced user exists and is properly authenticated

### **Error: "permission denied"**
**Solution:** Check user authentication and RLS policies

## 🚀 **Prevention Tips**

1. **Always test RLS policies** before deploying
2. **Use simple queries** initially, then optimize
3. **Check authentication** before database operations
4. **Monitor console errors** for debugging
5. **Test with different user roles** to ensure proper access control

## 📞 **Getting Help**

If you're still experiencing issues:

1. **Check the browser console** for detailed error messages
2. **Run the debug SQL scripts** to verify database setup
3. **Test with the simplified queries** provided above
4. **Verify your Supabase project settings** and authentication
5. **Check the RLS policies** are correctly configured

**The Teams system should work once the database queries and RLS policies are properly configured!** 🎯
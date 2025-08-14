# NoteX Teams & Settings System

A comprehensive real-time collaboration and customization system that integrates with **Supabase** for live updates, team management, and user preferences. No mock data, just live collaboration with instant updates.

## 🚀 **Features**

### **Teams System**
- **Real-time team management** with live member updates
- **Role-based permissions** (owner, admin, member, viewer)
- **Team projects** and collaborative work tracking
- **Shared AI insights** across team members
- **Team reports** and collaborative dashboards
- **Activity tracking** and team collaboration history
- **Member invitations** with email-based invites

### **Settings System**
- **Profile management** with real-time updates
- **Widget customization** (colors, position, size, behavior)
- **User preferences** (theme, language, timezone, notifications)
- **Feature flags** for enabling/disabling specific features
- **Real-time settings sync** across all devices
- **Custom CSS** support for advanced widget styling

## 🏗️ **Architecture**

```
Frontend (React) ←→ Supabase ←→ Real-time Updates
     ↓              ↓           ↓
Teams + Settings  Database    Live Collaboration
Management        + RLS       + Instant Sync
```

## 📋 **Prerequisites**

1. **Supabase Project** with Edge Functions enabled
2. **Supabase Realtime** enabled for live updates
3. **Node.js 18+** for local development
4. **Supabase CLI** installed

## 🗄️ **Database Setup**

### 1. Run the Migrations

Execute these SQL files in your Supabase SQL Editor:

```sql
-- 1. Teams system
-- File: supabase/migrations/20241201000008_create_teams_system.sql

-- 2. Settings and additional tables
-- File: supabase/migrations/20241201000010_create_settings_and_teams_tables.sql
```

### 2. Verify Tables Created

```sql
-- Check that all tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'teams', 'team_members', 'team_invitations', 'team_projects',
  'team_insights', 'team_reports', 'team_activities',
  'widget_settings', 'user_preferences', 'feature_flags'
);
```

## 🎯 **Frontend Integration**

### 1. Add Routes to App.tsx

```tsx
import Teams from "./pages/Teams";
import Settings from "./pages/Settings";

// Add these routes
<Route path="/teams" element={
  <ProtectedRoute>
    <DashboardLayout>
      <Teams />
    </DashboardLayout>
  </ProtectedRoute>
} />
<Route path="/settings" element={
  <ProtectedRoute>
    <DashboardLayout>
      <Settings />
    </DashboardLayout>
  </ProtectedRoute>
} />
```

### 2. Update Navigation

Add navigation links to your menu:

```tsx
<Link to="/teams" className="flex items-center">
  <Users className="h-4 w-4 mr-2" />
  Teams
</Link>
<Link to="/settings" className="flex items-center">
  <Settings className="h-4 w-4 mr-2" />
  Settings
</Link>
```

## 🔐 **Security Features**

### 1. Row Level Security (RLS)

All tables have RLS enabled with user-specific policies:

```sql
-- Users can only see teams they're members of
CREATE POLICY "teams_member_view" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = id AND user_id = auth.uid() AND status = 'active'
    )
  );

-- Users can only manage their own settings
CREATE POLICY "widget_settings_owner_all" ON widget_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### 2. Role-Based Access Control

Team members have different permission levels:

- **Owner**: Full team management, can delete team
- **Admin**: Can invite/remove members, manage projects
- **Member**: Can create/edit projects and insights
- **Viewer**: Read-only access to team content

## 📱 **Usage Flow**

### 1. Team Creation

1. User clicks "Create Team" button
2. Enters team name and description
3. User automatically becomes team owner
4. Team appears in user's team list instantly

### 2. Team Collaboration

1. Team owner invites members via email
2. Invited users receive email invitations
3. Members accept invitations and join team
4. All team members see real-time updates

### 3. Settings Management

1. User updates profile, widget, or preferences
2. Changes saved to Supabase immediately
3. Real-time subscriptions update UI instantly
4. Settings sync across all user devices

## 🔄 **Real-time Updates**

### 1. Team Changes

```typescript
// Subscribe to team updates
const teamsChannel = supabase
  .channel('teams-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'teams'
  }, (payload) => {
    // UI updates instantly
    if (payload.eventType === 'INSERT') {
      setTeams(prev => [...prev, payload.new as Team]);
    }
  })
  .subscribe();
```

### 2. Settings Updates

```typescript
// Subscribe to widget settings changes
const widgetChannel = supabase
  .channel('widget-settings-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'widget_settings',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    // Widget settings update live
    setWidgetSettings(payload.new as WidgetSettings);
  })
  .subscribe();
```

## 🎨 **UI Components**

### 1. Teams Page

- **Team Overview Cards**: Total teams, members, projects, insights
- **Team Selection**: Switch between different teams
- **Member Management**: View roles, invite new members
- **Project Tracking**: Monitor team projects and status
- **Shared Insights**: View AI insights shared across team
- **Team Reports**: Access collaborative reports

### 2. Settings Page

- **Profile Settings**: Update name, email, avatar
- **Widget Customization**: Colors, position, size, behavior
- **User Preferences**: Theme, language, timezone, notifications
- **Feature Management**: Enable/disable specific features
- **Real-time Preview**: See changes instantly

## 🧪 **Testing**

### 1. Test Team Creation

```bash
# Create a test team
# Navigate to /teams and click "Create Team"
# Verify team appears in list immediately
```

### 2. Test Real-time Updates

```bash
# Open two browser windows
# Make changes in one window
# Verify updates appear in other window instantly
```

### 3. Test Settings Sync

```bash
# Change widget colors in settings
# Verify changes apply immediately
# Check that settings persist across page reloads
```

## 🚨 **Troubleshooting**

### 1. Teams Not Loading

- Check RLS policies are correctly applied
- Verify user is authenticated
- Check browser console for errors
- Ensure Supabase Realtime is enabled

### 2. Settings Not Saving

- Verify user has write permissions
- Check RLS policies allow updates
- Ensure form validation passes
- Check Supabase logs for errors

### 3. Real-time Updates Not Working

- Verify Supabase Realtime is enabled
- Check subscription channels are active
- Ensure RLS policies allow user access
- Check browser console for subscription errors

### 4. Database Errors

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('teams', 'team_members', 'widget_settings');

-- Check table permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name IN ('teams', 'team_members', 'widget_settings');
```

## 📊 **Monitoring**

### 1. Team Activity

```sql
-- Monitor team creation
SELECT COUNT(*) as total_teams, 
       DATE(created_at) as date
FROM teams 
GROUP BY DATE(created_at) 
ORDER BY date DESC;

-- Monitor team member activity
SELECT tm.role, COUNT(*) as member_count
FROM team_members tm
WHERE tm.status = 'active'
GROUP BY tm.role;
```

### 2. Settings Usage

```sql
-- Monitor widget customization
SELECT widget_position, COUNT(*) as usage_count
FROM widget_settings 
GROUP BY widget_position;

-- Monitor feature flag usage
SELECT feature_name, 
       COUNT(*) as total_users,
       COUNT(*) FILTER (WHERE is_enabled) as enabled_users
FROM feature_flags 
GROUP BY feature_name;
```

## 🔮 **Future Enhancements**

### 1. Team Features

- **Team templates** for quick setup
- **Advanced permissions** with custom roles
- **Team analytics** and performance metrics
- **Integration with external tools** (Slack, Teams)

### 2. Settings Features

- **Advanced widget themes** and presets
- **User onboarding** and guided setup
- **Settings import/export** functionality
- **A/B testing** for feature rollouts

### 3. Collaboration Features

- **Real-time chat** within teams
- **File sharing** and document collaboration
- **Task management** and project tracking
- **Meeting scheduling** and calendar integration

## 📚 **API Reference**

### Database Functions

#### `get_user_teams(user_uuid UUID)`

Returns all teams a user is a member of.

#### `log_team_activity(team_id, user_id, action, entity_type, entity_id, details)`

Logs team activity for audit and tracking.

### Real-time Channels

#### Teams Channel
- **Table**: `teams`
- **Events**: INSERT, UPDATE, DELETE
- **Filter**: None (global team changes)

#### Team Members Channel
- **Table**: `team_members`
- **Events**: INSERT, UPDATE, DELETE
- **Filter**: None (global member changes)

#### Settings Channels
- **Tables**: `widget_settings`, `user_preferences`, `feature_flags`
- **Events**: INSERT, UPDATE, DELETE
- **Filter**: `user_id=eq.{user.id}`

## 🎉 **Success!**

Your NoteX Teams & Settings system is now:

✅ **Fully integrated** with Supabase Realtime  
✅ **Real-time collaboration** with instant updates  
✅ **Secure** with RLS and role-based permissions  
✅ **Production-ready** with proper error handling  
✅ **Mobile-responsive** with modern UI  
✅ **Feature-rich** with comprehensive customization  

Users can now:
- **Create and manage teams** for collaboration
- **Invite team members** with role-based access
- **Share insights and projects** across teams
- **Customize their experience** with real-time settings
- **Manage feature access** with feature flags
- **See all changes instantly** via real-time updates

## 🚀 **Next Steps**

1. **Test the system** with multiple users
2. **Customize team roles** and permissions
3. **Add team templates** for common use cases
4. **Integrate with external tools** (Slack, email)
5. **Add advanced analytics** for team performance
6. **Implement team billing** and seat management

Your NoteX platform now has enterprise-grade team collaboration and user customization capabilities!
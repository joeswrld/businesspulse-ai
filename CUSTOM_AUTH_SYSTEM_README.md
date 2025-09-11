# Custom Authentication System for NoteX

This document describes the complete custom authentication system that replaces the default Supabase Auth UI with a branded, company-focused signup flow.

## 🎯 Overview

The custom authentication system enforces business requirements where every new user must provide a company name before gaining access to NoteX. It includes:

- **Required company name** for all new signups
- **8-day free trial** with automatic expiration
- **Branded email templates** for confirmation and password reset
- **Trial expired lockout** with upgrade prompts
- **Secure RLS policies** and access control
- **Email confirmation enforcement**

## 🏗️ Architecture

### Database Schema

#### Profiles Table Structure
```sql
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    company_name TEXT NOT NULL, -- REQUIRED
    email_confirmed BOOLEAN DEFAULT FALSE,
    trial_start TIMESTAMPTZ DEFAULT NOW(),
    trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '8 days'),
    avatar_url TEXT,
    role TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Key Constraints
- `company_name` is required (NOT NULL constraint)
- `email` must be unique
- `user_id` must be unique
- Trial automatically expires after 8 days

### Authentication Flow

1. **Signup** → User provides full_name, company_name, email, password
2. **Email Confirmation** → User must verify email before accessing app
3. **Trial Period** → 8-day free trial begins after email confirmation
4. **Access Control** → Trial/subscription status checked on every request
5. **Trial Expiration** → Users redirected to upgrade page when trial ends

## 📁 File Structure

### New Pages
```
src/pages/
├── Signup.tsx              # Custom signup form with company_name
├── Login.tsx               # Custom login form
├── ResetPassword.tsx       # Custom password reset flow
├── VerifyEmail.tsx         # Email verification page
└── TrialExpired.tsx        # Trial expired lockout page
```

### Components
```
src/components/
└── AuthGuard.tsx           # Route protection middleware
```

### Database Migrations
```
supabase/migrations/
├── 20250910051804_fix_profiles_table_and_auth_triggers.sql
└── 20250910051900_create_custom_auth_system.sql
```

### Email Templates
```
supabase/templates/
├── confirmation.html       # Branded email confirmation
└── recovery.html          # Branded password reset
```

## 🔧 Setup Instructions

### 1. Apply Database Migrations

```bash
# Apply the migrations
supabase db push

# Or use the deployment script
./deploy-custom-auth.sh
```

### 2. Configure Email Templates

1. Go to your Supabase Dashboard
2. Navigate to Authentication → Email Templates
3. Replace the default templates with the custom ones in `supabase/templates/`
4. Configure your email provider (SMTP, SendGrid, etc.)

### 3. Update Supabase Settings

In your Supabase project settings:

1. **Authentication → Settings**:
   - Enable email confirmations
   - Set confirmation redirect URL: `https://yourdomain.com/verify-email`
   - Set password reset redirect URL: `https://yourdomain.com/reset-password`

2. **Authentication → Policies**:
   - Ensure RLS is enabled on profiles table
   - Verify the custom policies are active

## 🚀 Usage

### Signup Flow

1. User visits `/signup`
2. Fills out form with:
   - Full Name (required)
   - Company Name (required)
   - Email (required)
   - Password (required, min 8 chars)
3. System creates auth user and profile
4. User receives branded confirmation email
5. User clicks email link → redirected to `/verify-email`
6. After verification → 8-day trial begins

### Login Flow

1. User visits `/login`
2. Enters email and password
3. System checks:
   - Email is confirmed
   - Trial is active OR subscription is active
4. If trial expired → redirected to `/trial-expired`
5. If valid → redirected to `/dashboard`

### Password Reset Flow

1. User visits `/reset-password`
2. Enters email address
3. Receives branded reset email
4. Clicks link → redirected to `/reset-password?reset=true`
5. Sets new password
6. Redirected to login with success message

## 🔒 Security Features

### Row Level Security (RLS)
```sql
-- Users can only access their own profile
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id OR auth.uid() = user_id);
```

### Access Control
- Email confirmation required before app access
- Trial expiration automatically enforced
- Subscription status checked on protected routes
- Secure password requirements (8+ characters)

### Data Validation
- Company name is required and validated
- Email format validation
- Password strength requirements
- SQL injection protection via parameterized queries

## 🎨 UI/UX Features

### Modern Design
- Inter font family
- Primary blue color scheme (#2563eb)
- Clean spacing and rounded corners
- Mobile responsive design
- Loading states and error handling

### User Experience
- Clear error messages
- Progress indicators
- Success confirmations
- Intuitive navigation
- Accessible form controls

## 📊 Database Functions

### Core Functions

#### `handle_new_user_custom()`
- Triggered on new user creation
- Validates company_name requirement
- Creates profile with trial dates
- Handles email confirmation status

#### `handle_email_confirmation_custom()`
- Triggered on email confirmation
- Updates profile email_confirmed status
- Logs confirmation events

#### `check_user_access(user_uuid)`
- Returns access status for user
- Checks trial and subscription status
- Used by AuthGuard for route protection

#### `get_user_profile_with_access(user_uuid)`
- Returns complete user profile with access info
- Includes trial dates and subscription status
- Used throughout the app

## 🧪 Testing

### Manual Testing Checklist

- [ ] Signup with valid company name
- [ ] Signup without company name (should fail)
- [ ] Email confirmation flow
- [ ] Login with confirmed email
- [ ] Login with unconfirmed email (should redirect)
- [ ] Password reset flow
- [ ] Trial expiration logic
- [ ] Trial expired page functionality
- [ ] Route protection (try accessing protected routes without auth)
- [ ] Mobile responsiveness

### Database Testing

```sql
-- Test user creation
SELECT * FROM profiles WHERE company_name IS NOT NULL;

-- Test access control
SELECT * FROM check_user_access('user-uuid-here');

-- Test trial status
SELECT id, company_name, trial_start, trial_end, 
       (trial_end > NOW()) as trial_active
FROM profiles;
```

## 🚨 Troubleshooting

### Common Issues

#### "Company name is required" Error
- Check that the migration was applied correctly
- Verify the constraint exists: `profiles_company_name_required`

#### Email Confirmation Not Working
- Check Supabase email settings
- Verify email templates are configured
- Check redirect URLs in Supabase settings

#### Trial Not Expiring
- Verify the trigger `on_auth_user_created` exists
- Check that `trial_end` is being set correctly
- Test the `check_user_access` function

#### RLS Policy Issues
- Ensure RLS is enabled on profiles table
- Check that policies are created correctly
- Verify user context in policies

### Debug Commands

```sql
-- Check table structure
\d profiles

-- Check triggers
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'users';

-- Check functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Test access function
SELECT * FROM check_user_access(auth.uid());
```

## 📈 Monitoring

### Key Metrics to Track

1. **Signup Conversion Rate**
   - Total signups vs. email confirmations
   - Company name completion rate

2. **Trial Engagement**
   - Users who complete trial vs. upgrade
   - Feature usage during trial

3. **Email Deliverability**
   - Confirmation email open rates
   - Password reset success rates

4. **Security Metrics**
   - Failed login attempts
   - Unconfirmed email access attempts

## 🔄 Maintenance

### Regular Tasks

1. **Monitor trial expirations**
   - Check for users with expired trials
   - Ensure upgrade flow is working

2. **Email template updates**
   - Keep branding consistent
   - Test email deliverability

3. **Security reviews**
   - Audit RLS policies
   - Check for unauthorized access

4. **Performance monitoring**
   - Database query performance
   - Auth flow response times

## 🎯 Future Enhancements

### Planned Features

1. **Advanced Trial Management**
   - Trial extension options
   - Usage-based trial limits

2. **Enhanced Security**
   - Two-factor authentication
   - SSO integration

3. **Analytics Integration**
   - User behavior tracking
   - Conversion funnel analysis

4. **Customization Options**
   - White-label email templates
   - Custom trial durations

## 📞 Support

For issues with the custom authentication system:

1. Check the troubleshooting section above
2. Review the database migrations
3. Test the core functions manually
4. Check Supabase logs for errors
5. Verify email configuration

## 📝 Changelog

### Version 1.0.0 (2024-09-10)
- Initial implementation of custom auth system
- Company name requirement enforcement
- 8-day trial system
- Branded email templates
- Trial expired lockout page
- Complete route protection
- RLS policies and security measures

---

**Note**: This system replaces the default Supabase Auth UI completely. All authentication flows now go through the custom pages and enforce business requirements.
# 🎯 Team Invitation System

## 📋 **Overview**

A comprehensive team invitation system built with Supabase that allows users to invite team members via email with real-time collaboration features, role management, and beautiful email templates.

## ✨ **Features**

### **Core Functionality**
- ✅ **Email Invitations** - Send invitations to any email address
- ✅ **Role Management** - Assign roles (Member, Moderator, Admin)
- ✅ **Personal Messages** - Add custom messages to invitations
- ✅ **Token-based Security** - Secure invitation links with unique tokens
- ✅ **Expiration System** - Automatic expiration after 7 days
- ✅ **Status Tracking** - Track pending, accepted, declined, expired invitations
- ✅ **Real-time Updates** - Live status updates and notifications

### **Email System**
- ✅ **Beautiful Templates** - Professional HTML email templates
- ✅ **Responsive Design** - Mobile-friendly email layouts
- ✅ **Branded Content** - NoteX branding and styling
- ✅ **Personalization** - Dynamic content based on invitation details
- ✅ **Call-to-Action** - Direct links to accept/decline invitations

### **Security & Validation**
- ✅ **Email Validation** - Proper email format validation
- ✅ **Duplicate Prevention** - Prevent duplicate invitations
- ✅ **Permission Checks** - Only owners/admins can invite
- ✅ **RLS Policies** - Database-level security
- ✅ **Token Security** - Cryptographically secure tokens

## 🏗️ **Architecture**

### **Database Schema**
```sql
team_invitations (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  inviter_id UUID REFERENCES auth.users(id),
  email VARCHAR(255),
  role VARCHAR(50),
  personal_message TEXT,
  status VARCHAR(20),
  token VARCHAR(255) UNIQUE,
  expires_at TIMESTAMP,
  accepted_at TIMESTAMP,
  declined_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### **Key Functions**
- `accept_team_invitation(token)` - Accept invitation
- `decline_team_invitation(token)` - Decline invitation
- `get_invitation_details(token)` - Get invitation details
- `clean_expired_invitations()` - Clean expired invitations

### **Edge Function**
- `send-team-invitation` - Sends invitation emails
- Handles email template generation
- Manages email delivery
- Updates invitation status

## 🚀 **Quick Start**

### **1. Deploy the System**
```bash
# Run the deployment script
./deploy-invitation-system.sh
```

### **2. Configure Email Service**
1. Go to Supabase Dashboard > Settings > Email Templates
2. Configure SMTP settings or use Supabase's email service
3. Set up email templates if needed

### **3. Set Environment Variables**
```bash
# Set your site URL
supabase secrets set SITE_URL="https://your-domain.com"
```

### **4. Test the System**
1. Create a team
2. Click "Invite Member" from the three-dot menu
3. Enter email, role, and optional message
4. Send invitation
5. Check email delivery

## 📱 **User Interface**

### **Invitation Dialog**
```
┌─────────────────────────────────────┐
│ Invite Team Member                  │
├─────────────────────────────────────┤
│ Email Address                       │
│ [colleague@example.com]             │
│                                     │
│ Role                                │
│ [Member ▼]                          │
│                                     │
│ Personal Message (Optional)         │
│ [Add a personal message...]         │
│                                     │
│ [Cancel] [Send Invitation]          │
└─────────────────────────────────────┘
```

### **Invitation Page**
```
┌─────────────────────────────────────┐
│ 🎉 Team Invitation                  │
│ You've been invited to join NoteX   │
├─────────────────────────────────────┤
│ [Team Icon] Team Name               │
│         [Role Badge]                │
│                                     │
│ Team Description                    │
│                                     │
│ [Avatar] Inviter Name               │
│         inviter@email.com           │
│                                     │
│ Personal Message:                   │
│ "Welcome to our team!"              │
│                                     │
│ Expires: Dec 8, 2024                │
│                                     │
│ [Accept Invitation] [Decline]       │
└─────────────────────────────────────┘
```

## 🔧 **Technical Implementation**

### **Frontend Integration**

#### **Teams Page Updates**
```typescript
// Enhanced inviteMember function
const inviteMember = async () => {
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(inviteData.email)) {
    toast.error('Please enter a valid email address');
    return;
  }

  // Create invitation
  const { data: invitation } = await supabase
    .from('team_invitations')
    .insert({
      team_id: selectedTeam.id,
      inviter_id: user.id,
      email: inviteData.email,
      role: inviteData.role,
      personal_message: inviteData.message || null
    })
    .select()
    .single();

  // Send email
  await supabase.functions.invoke('send-team-invitation', {
    body: { invitation_id: invitation.id }
  });
};
```

#### **Invitation Page**
```typescript
// Handle invitation acceptance
const handleAcceptInvitation = async () => {
  const { data } = await supabase.rpc('accept_team_invitation', {
    invitation_token: token
  });
  
  if (data.success) {
    toast.success('Invitation accepted successfully!');
    navigate('/teams');
  }
};
```

### **Email Template**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Team Invitation - NoteX</title>
  <style>
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .button { background: #667eea; color: white; padding: 12px 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 You're Invited to Join NoteX!</h1>
  </div>
  <div class="content">
    <h2>${teamName}</h2>
    <p><strong>Role:</strong> ${role}</p>
    <p>"${personalMessage}"</p>
    <a href="${invitationUrl}" class="button">Accept Invitation</a>
  </div>
</body>
</html>
```

## 📊 **Database Functions**

### **Accept Invitation**
```sql
CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_token TEXT)
RETURNS JSON AS $$
BEGIN
  -- Validate invitation
  -- Check if user is already a member
  -- Add user to team
  -- Update invitation status
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Get Invitation Details**
```sql
CREATE OR REPLACE FUNCTION get_invitation_details(invitation_token TEXT)
RETURNS JSON AS $$
BEGIN
  -- Return invitation details with team and inviter info
  RETURN json_build_object(
    'team_name', t.name,
    'inviter_name', u.raw_user_meta_data->>'full_name',
    'role', ti.role,
    'personal_message', ti.personal_message
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🔒 **Security Features**

### **Row Level Security (RLS)**
```sql
-- Users can only view invitations they sent
CREATE POLICY "Users can view invitations they sent" ON team_invitations
  FOR SELECT USING (inviter_id = auth.uid());

-- Users can view invitations sent to their email
CREATE POLICY "Users can view invitations sent to their email" ON team_invitations
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Only team owners/admins can create invitations
CREATE POLICY "Team owners and admins can create invitations" ON team_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = team_invitations.team_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );
```

### **Token Security**
- 32-byte random tokens
- Unique constraint on tokens
- Automatic expiration
- Secure token generation

## 📧 **Email Configuration**

### **Supabase Email Service**
1. **Built-in Service**: Use Supabase's email service
2. **SMTP Configuration**: Configure external SMTP
3. **Email Templates**: Customize email templates
4. **Delivery Tracking**: Monitor email delivery

### **Environment Variables**
```bash
SITE_URL=https://your-domain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 🧪 **Testing**

### **Manual Testing**
1. **Create Team**: Create a new team
2. **Send Invitation**: Use the invite dialog
3. **Check Email**: Verify email delivery
4. **Accept Invitation**: Click invitation link
5. **Verify Membership**: Check team members

### **Automated Testing**
```typescript
// Test invitation creation
const testInvitation = async () => {
  const { data, error } = await supabase
    .from('team_invitations')
    .insert({
      team_id: 'test-team-id',
      inviter_id: 'test-user-id',
      email: 'test@example.com',
      role: 'member'
    });
  
  expect(error).toBeNull();
  expect(data).toBeDefined();
};
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Email Not Sending**
- Check SMTP configuration
- Verify environment variables
- Check Edge Function logs
- Ensure email service is enabled

#### **Invitation Link Not Working**
- Verify token is valid
- Check if invitation is expired
- Ensure user is authenticated
- Check RLS policies

#### **Permission Errors**
- Verify user has owner/admin role
- Check team membership
- Ensure RLS policies are correct
- Verify invitation ownership

### **Debug Steps**
1. **Check Console Logs**: Look for error messages
2. **Verify Database**: Check invitation records
3. **Test Edge Function**: Test email function directly
4. **Check RLS**: Verify policy permissions
5. **Validate Tokens**: Ensure tokens are valid

## 📈 **Analytics & Monitoring**

### **Invitation Statistics**
```sql
-- View invitation statistics
SELECT 
  team_id,
  COUNT(*) as total_invitations,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
  COUNT(*) FILTER (WHERE status = 'declined') as declined
FROM team_invitations
GROUP BY team_id;
```

### **Email Tracking**
- Track email delivery status
- Monitor open rates
- Track click-through rates
- Analyze invitation acceptance rates

## 🔮 **Future Enhancements**

### **Planned Features**
- **Bulk Invitations**: Invite multiple users at once
- **Invitation Templates**: Pre-defined invitation messages
- **Advanced Analytics**: Detailed invitation analytics
- **Email Scheduling**: Schedule invitations for later
- **Reminder Emails**: Automatic reminder emails
- **Invitation History**: Complete invitation history
- **Export Data**: Export invitation data
- **API Integration**: REST API for invitations

### **Advanced Email Features**
- **Email Templates**: Multiple template options
- **Branding Options**: Custom branding
- **A/B Testing**: Test different email versions
- **Email Analytics**: Track email performance
- **Spam Prevention**: Improve deliverability

---

## 🎉 **Success!**

**Your Team Invitation System is now fully functional with:**

✅ **Complete Email System** - Professional invitation emails  
✅ **Secure Token System** - Cryptographically secure invitations  
✅ **Role Management** - Flexible role assignment  
✅ **Real-time Updates** - Live status tracking  
✅ **Beautiful UI** - Professional user interface  
✅ **Comprehensive Security** - Multi-layer security  
✅ **Easy Deployment** - Simple deployment process  

**Users can now invite team members with beautiful emails and real-time collaboration!** 🚀
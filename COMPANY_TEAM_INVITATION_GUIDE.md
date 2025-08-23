# Company Team Invitation System Guide

## 🏢 Overview

This system allows company owners and admins to invite team members to collaborate on their company workspace. The invitation system supports role-based access control and provides a seamless onboarding experience for new team members.

## 🎯 Features

### ✅ **What's Already Working**

1. **Team Creation**: Company owners can create teams
2. **Role Assignment**: Invite members with specific roles (Member, Moderator, Admin)
3. **Email Invitations**: Send invitations via email with personal messages
4. **Role-Based Permissions**: Different access levels for different roles
5. **Invitation Management**: Track pending, accepted, and declined invitations
6. **Team Member Management**: View and manage team members

### 🔧 **Available Roles**

- **Owner**: Full control over the team (can invite, manage, delete)
- **Admin**: Can invite members and manage team settings
- **Moderator**: Can moderate content and manage members
- **Member**: Standard team member with basic access

## 🚀 **How to Use the System**

### **For Company Owners/Admins:**

#### 1. **Create a Team**
- Click "Create Team" button
- Fill in team details (name, description, settings)
- The creator automatically becomes the team owner

#### 2. **Invite Team Members**
- Navigate to your team
- Click the "Invite" button or use the dropdown menu
- Fill in the invitation form:
  - **Email Address**: Enter colleague's email
  - **Role**: Select appropriate role (Member, Moderator, Admin)
  - **Personal Message**: Add a welcome message (optional)

#### 3. **Manage Invitations**
- View all pending invitations in the "Invitations" tab
- Track invitation status (pending, accepted, declined, expired)
- Resend invitations if needed

### **For Invited Team Members:**

#### 1. **Receive Invitation**
- Check email for invitation link
- Click the invitation link to accept

#### 2. **Join the Team**
- Review team details and role assignment
- Accept or decline the invitation
- Start collaborating immediately upon acceptance

## 📊 **System Architecture**

### **Database Tables:**
- `teams`: Company/team information
- `team_members`: Team membership and roles
- `team_invitations`: Invitation tracking and management

### **Key Features:**
- **Row Level Security (RLS)**: Ensures proper access control
- **Email Integration**: Automatic invitation emails
- **Token-based Security**: Secure invitation links
- **Expiration Management**: Invitations expire after 7 days
- **Role Validation**: Ensures proper role assignments

## 🔐 **Security & Permissions**

### **Invitation Permissions:**
- ✅ Team owners can invite anyone
- ✅ Team admins can invite members
- ✅ Only team owners/admins can send invitations
- ✅ Invitations are tied to specific teams

### **Role Permissions:**
- **Owner**: Full team control
- **Admin**: Can invite and manage members
- **Moderator**: Can moderate content
- **Member**: Basic team access

## 🛠 **Technical Implementation**

### **Frontend Components:**
- Team creation dialog
- Invitation form with role selection
- Team member management interface
- Invitation tracking dashboard

### **Backend Functions:**
- Invitation creation and validation
- Email sending via Supabase Edge Functions
- Role-based access control
- Invitation status management

## 📈 **Usage Statistics**

The system provides comprehensive analytics:
- Total invitations per team
- Invitation acceptance rates
- Role distribution statistics
- Team member growth tracking

## 🔧 **Setup Instructions**

### **1. Apply Database Fixes**
Run the enhanced invitation system SQL:
```sql
-- Copy and paste the SQL from enhance_invitation_system.sql
-- This ensures all required columns and policies are in place
```

### **2. Configure Email Settings**
- Set up SMTP in Supabase dashboard
- Configure email templates
- Test invitation delivery

### **3. Test the System**
- Create a test team
- Send test invitations
- Verify role assignments
- Check email delivery

## 🎯 **Best Practices**

### **For Company Owners:**
1. **Start with Admins**: Invite key team members as admins first
2. **Use Clear Roles**: Assign roles based on responsibilities
3. **Personal Messages**: Add welcoming messages to invitations
4. **Monitor Growth**: Track invitation acceptance rates

### **For Team Members:**
1. **Review Role**: Understand your assigned permissions
2. **Accept Promptly**: Respond to invitations within 7 days
3. **Contact Admin**: Reach out if you need role changes

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **"Permission Denied" Error**
- Ensure you're the team owner or admin
- Check if team membership is properly set up
- Run the database fix SQL

#### **Invitation Not Received**
- Check spam folder
- Verify email address is correct
- Contact team admin to resend

#### **Role Assignment Issues**
- Only owners can change roles
- Contact team owner for role updates
- Check role permissions in team settings

### **Support Steps:**
1. Check browser console for errors
2. Verify team membership status
3. Run diagnostic SQL queries
4. Contact support if issues persist

## 📞 **Support**

If you encounter any issues:
1. Check this guide first
2. Run the diagnostic SQL queries
3. Review browser console for errors
4. Contact technical support

---

**🎉 The system is designed to provide a seamless team collaboration experience for companies of all sizes!**
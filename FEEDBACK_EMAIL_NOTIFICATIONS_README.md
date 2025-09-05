# 📧 Feedback Email Notifications System

This system automatically sends email notifications to users whenever they receive new feedback on their NoteX projects.

## 🏗️ Architecture

```
New Feedback Insert → Database Trigger → Supabase Realtime → Client Hook → Edge Function → Resend API → Email Sent
```

## 📁 Files Created

### 1. Database Trigger
- **`feedback_realtime_notification.sql`** - Creates a database trigger that notifies via Supabase Realtime when new feedback is inserted

### 2. Edge Function
- **`supabase/functions/send-feedback-email/index.ts`** - Handles email sending via Resend API

### 3. Client Hook
- **`src/hooks/useFeedbackEmailNotifications.ts`** - Listens for real-time feedback notifications and triggers email sending

### 4. Deployment Scripts
- **`deploy-feedback-email-notifications.sh`** - Automated deployment script
- **`test-feedback-email-notifications.js`** - Verification script

## 🚀 Setup Instructions

### 1. Deploy the Edge Function

```bash
# Deploy the send-feedback-email function
supabase functions deploy send-feedback-email
```

### 2. Set Environment Variables

In your Supabase project dashboard:
1. Go to **Settings** → **Edge Functions**
2. Add the following environment variable:
   - `RESEND_API_KEY` - Your Resend API key

### 3. Apply Database Triggers

Run the SQL in your Supabase SQL Editor:

```sql
-- Apply the realtime notification trigger
\i feedback_realtime_notification.sql
```

### 4. Enable Email Notifications in Your App

Add the hook to your feedback page:

```typescript
import { useFeedbackEmailNotifications } from '@/hooks/useFeedbackEmailNotifications';

// In your component
const MyFeedbackPage = () => {
  useFeedbackEmailNotifications(); // This enables email notifications
  
  // ... rest of your component
};
```

## 📧 Email Template

The system sends professional HTML emails with:

- **Subject**: `📩 New Feedback Received`
- **From**: `NoteX <noreply@notex.com.ng>`
- **Content**: 
  - Feedback message
  - Timestamp
  - Feedback ID
  - User details (if provided)
  - Project ID
  - Link to dashboard

## 🔧 Configuration

### Resend API Setup

1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. Add it to Supabase Edge Functions environment variables
4. Verify your domain (optional but recommended)

### Customization

You can customize the email template by editing:
- **Email subject**: Change in `supabase/functions/send-feedback-email/index.ts`
- **Email content**: Modify the HTML template in the same file
- **From address**: Update the `from` field in the Resend API call

## 🧪 Testing

### 1. Test with Dummy Data

```sql
-- Insert test feedback
INSERT INTO feedback (user_id, project_id, message, name, email, status, sentiment)
VALUES (
  'your-user-id',
  'your-project-id', 
  'This is a test feedback message',
  'Test User',
  'test@example.com',
  'new',
  'positive'
);
```

### 2. Check Logs

Monitor Supabase logs for the Edge Function:
```bash
supabase functions logs send-feedback-email
```

### 3. Verify Email Delivery

Check your email inbox for the notification email.

## 🛠️ Troubleshooting

### Common Issues

1. **No emails being sent**
   - Check if `RESEND_API_KEY` is set correctly
   - Verify the Edge Function is deployed
   - Check Supabase logs for errors

2. **Database trigger not working**
   - Ensure the trigger SQL was applied successfully
   - Check if the `feedback` table exists
   - Verify permissions are set correctly

3. **Client hook not triggering**
   - Check if the user is authenticated
   - Verify Supabase Realtime is enabled
   - Check browser console for errors

### Debug Steps

1. **Check Edge Function logs**:
   ```bash
   supabase functions logs send-feedback-email --follow
   ```

2. **Test Edge Function directly**:
   ```bash
   curl -X POST 'https://your-project.supabase.co/functions/v1/send-feedback-email' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"feedback_id":"test","user_id":"user-id","message":"test message"}'
   ```

3. **Check database trigger**:
   ```sql
   -- Check if trigger exists
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'feedback_realtime_trigger';
   ```

## 📊 Monitoring

### Success Metrics
- Email delivery rate
- Edge Function response times
- Error rates in logs

### Logs to Monitor
- Edge Function logs: `supabase functions logs send-feedback-email`
- Database logs: Check Supabase dashboard
- Client-side logs: Browser console

## 🔒 Security

- All API calls require authentication
- Environment variables are securely stored in Supabase
- Email addresses are validated before sending
- Rate limiting is handled by Resend API

## 🚀 Production Considerations

1. **Rate Limiting**: Resend has rate limits - monitor usage
2. **Error Handling**: Failed emails are logged but don't crash the system
3. **Monitoring**: Set up alerts for high error rates
4. **Backup**: Consider storing email logs in your database

## 📝 API Reference

### Edge Function Endpoint

**POST** `/functions/v1/send-feedback-email`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body**:
```json
{
  "feedback_id": "string",
  "user_id": "string", 
  "project_id": "string",
  "message": "string",
  "name": "string (optional)",
  "email": "string (optional)",
  "timestamp": "string"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "feedback_id": "string",
    "user_id": "string",
    "user_email": "string",
    "resend_id": "string",
    "sent_at": "string"
  }
}
```

## 🎉 Success!

Once deployed, users will automatically receive email notifications whenever they get new feedback on their NoteX projects!
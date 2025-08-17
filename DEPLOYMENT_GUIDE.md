# AI Insights Upload Integration - Deployment Guide

## Overview

This guide covers the deployment of the enhanced AI Insights page with integrated upload functionality and **immediate streaming insights**. The implementation includes real-time file upload, instant AI processing, and live insight generation.

## Prerequisites

### Required Services
- **Supabase Project**: For database, storage, and edge functions
- **Gemini AI API Key**: For AI-powered insight generation
- **Vercel/Netlify**: For frontend deployment (optional)

### Environment Variables
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Supabase Service Role (for Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Setup

### 1. Run Migrations
```bash
# Apply all migrations including the new uploads bucket
npx supabase db push

# Or run migrations individually
npx supabase migration up
```

### 2. Verify Tables
Ensure these tables exist in your Supabase database:
- `data_sources` - Stores upload metadata
- `ai_insights` - Stores generated insights
- `ai_insights_feedback` - Stores user feedback
- `action_plans` - Stores insight action items

### 3. Storage Buckets
Verify the `uploads` bucket is created with proper RLS policies:
```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'uploads';

-- Verify RLS policies
SELECT * FROM storage.policies WHERE bucket_id = 'uploads';
```

## 🚨 IMPORTANT: Create Uploads Bucket

The most common issue is the "bucket not found" error. Here's how to fix it:

### Option 1: Manual Creation (Recommended)
1. Go to your **Supabase Dashboard**
2. Navigate to **Storage > Buckets**
3. Click **"New Bucket"**
4. Set bucket name: `uploads`
5. Set **Public**: `false` (for security)
6. Click **"Create bucket"**

### Option 2: Automatic Creation via Script
```bash
# Set environment variables
export VITE_SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run the bucket creation script
node scripts/create-uploads-bucket.js
```

### Option 3: SQL Commands
Run these in your Supabase SQL Editor:

```sql
-- Create the uploads bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for uploads bucket
CREATE POLICY "Users can upload their own files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow service role to access all files for processing
CREATE POLICY "Service role can access all files"
ON storage.objects
FOR ALL
USING (bucket_id = 'uploads' AND auth.role() = 'service_role');
```

## Edge Function Deployment

### 1. Deploy Edge Functions
```bash
# Deploy the streaming insights function (NEW)
npx supabase functions deploy stream-insights

# Deploy the background processing function (LEGACY)
npx supabase functions deploy process-upload-to-insights

# Verify deployment
npx supabase functions list
```

### 2. Configure Environment Variables
Set the following secrets for the Edge Functions:
```bash
npx supabase secrets set GEMINI_API_KEY=your_gemini_api_key
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Test Edge Functions
```bash
# Test the streaming function locally (if Docker is available)
npx supabase functions serve stream-insights

# Or test via Supabase Dashboard
# Go to Edge Functions > stream-insights > Test
```

## Frontend Deployment

### 1. Build Application
```bash
# Install dependencies
npm install

# Build for production
npm run build
```

### 2. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 3. Configure Environment Variables
In Vercel dashboard, set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🚀 New Streaming Features

### Immediate Insights Generation
The new implementation provides **instant insights** instead of background processing:

1. **User uploads file or pastes text**
2. **Content is sent directly to Gemini AI**
3. **Insights appear immediately on the page**
4. **Data is saved to Supabase for persistence**

### Live Analysis Indicators
- **Real-time processing status** with animated indicators
- **Live insight cards** that appear as they're generated
- **Instant metrics updates** (Total Insights, High Priority, Avg Confidence)
- **Streaming visual feedback** with sparkle animations

### Enhanced User Experience
- **No more "processing in background" delays**
- **Immediate feedback** for all uploads
- **Live insight generation** with visual progress
- **Seamless integration** with existing insights

## Testing the Integration

### 1. Test Immediate Insights
1. Navigate to AI Insights page
2. Click "Upload Data" button
3. Upload a file or paste text
4. **Insights should appear immediately** (no background processing)
5. Check that metrics update in real-time

### 2. Test File Upload
1. Drag and drop a CSV/PDF/DOCX/TXT file
2. Verify immediate processing starts
3. Watch insights appear live on the page
4. Confirm data is saved to Supabase

### 3. Test Text Input
1. Open upload modal
2. Paste text content into textarea
3. Click "Generate Insights"
4. Verify instant insight generation

### 4. Test Real-time Updates
1. Upload content in one browser tab
2. Open AI Insights page in another tab
3. Verify insights appear automatically
4. Check that metrics update in real-time

## Troubleshooting

### Common Issues

#### 1. "Bucket not found" Error
**Symptoms**: File upload fails with "bucket not found" error
**Solutions**:
- ✅ **Create the uploads bucket manually** in Supabase Dashboard
- ✅ **Run the bucket creation script**: `node scripts/create-uploads-bucket.js`
- ✅ **Execute SQL commands** in Supabase SQL Editor
- ✅ **Check bucket name** matches exactly: `uploads`

#### 2. Insights Not Appearing Immediately
**Symptoms**: Still seeing "processing in background" instead of instant insights
**Solutions**:
- Check `stream-insights` Edge Function is deployed
- Verify Gemini API key is configured
- Check Edge Function logs for errors
- Ensure frontend is calling the correct function

#### 3. File Upload Fails
**Symptoms**: File upload button doesn't work or shows error
**Solutions**:
- Check Supabase storage bucket exists
- Verify RLS policies are correct
- Check file size limits (10MB max)
- Ensure user is authenticated

#### 4. No Insights Generated
**Symptoms**: Upload succeeds but no insights appear
**Solutions**:
- Check Gemini API key is configured
- Verify Edge Function is deployed
- Check Edge Function logs for errors
- Ensure content is substantial enough for analysis

#### 5. Real-time Not Working
**Symptoms**: Insights don't appear automatically
**Solutions**:
- Check Supabase Realtime is enabled
- Verify database tables have REPLICA IDENTITY FULL
- Check network connectivity
- Ensure user authentication is valid

#### 6. Edge Function Errors
**Symptoms**: 500 errors or function timeouts
**Solutions**:
- Check function logs in Supabase Dashboard
- Verify environment variables are set
- Check Gemini API quota and limits
- Ensure proper error handling in function

### Debug Steps

#### 1. Check Browser Console
```javascript
// Add to AIInsights.tsx for debugging
console.log('Upload state:', { uploadFile, textInput, uploading });
console.log('User:', user);
console.log('Supabase client:', supabase);
console.log('Live insights:', liveInsights);
```

#### 2. Check Network Tab
- Monitor file upload requests
- Check Edge Function calls
- Verify response status codes

#### 3. Check Supabase Dashboard
- Database: Check data_sources and ai_insights tables
- Storage: Verify files are uploaded to uploads bucket
- Edge Functions: Check function logs and invocations

#### 4. Check Edge Function Logs
```bash
# View function logs
npx supabase functions logs stream-insights
npx supabase functions logs process-upload-to-insights
```

#### 5. Verify Bucket Setup
```bash
# Check if bucket exists
curl -X GET "https://your-project.supabase.co/storage/v1/bucket/list" \
  -H "Authorization: Bearer your_service_role_key"
```

## Performance Optimization

### 1. File Size Limits
- Set maximum file size to 10MB
- Recommend users compress large files
- Implement client-side file validation

### 2. Processing Optimization
- Immediate Gemini AI processing (no background jobs)
- Real-time insight generation
- Live UI updates

### 3. Real-time Optimization
- Debounced real-time updates
- Implement pagination for large insight lists
- Cache frequently accessed data

## Security Considerations

### 1. File Validation
- Validate file types on client and server
- Scan uploaded files for malware
- Implement file size limits

### 2. User Authentication
- Require authentication for all uploads
- Validate user ownership of data
- Implement session timeout

### 3. Data Privacy
- Encrypt sensitive data at rest
- Implement data retention policies
- Provide data deletion capabilities

## Monitoring

### 1. Key Metrics
- Upload success rate
- Processing time (should be immediate)
- Insight generation success rate
- User engagement with insights

### 2. Error Tracking
- Monitor Edge Function errors
- Track file upload failures
- Monitor AI API usage and limits

### 3. Performance Monitoring
- Track upload and processing times
- Monitor real-time update latency
- Track database query performance

## Future Enhancements

### 1. True Streaming
- Implement actual token-by-token streaming
- Add typing effect for insights
- Real-time priority/confidence updates

### 2. Advanced Analytics
- Track insight accuracy over time
- Implement A/B testing for AI prompts
- Add user feedback analysis

### 3. Integration Features
- Connect to external data sources
- Implement webhook notifications
- Add export functionality

## Support

For issues or questions:
1. Check this deployment guide
2. Review the AI_INSIGHTS_UPLOAD_README.md
3. Check Supabase documentation
4. Review Edge Function logs
5. Contact development team

## Rollback Plan

If issues arise, you can rollback by:
1. Reverting to previous database migration
2. Disabling the upload functionality
3. Rolling back Edge Function deployment
4. Reverting frontend changes

The upload functionality is designed to be non-breaking and can be safely disabled if needed.

## Quick Fix Checklist

If uploads aren't working, check these in order:

- [ ] **Uploads bucket exists** in Supabase Storage
- [ ] **RLS policies** are set up for the uploads bucket
- [ ] **stream-insights Edge Function** is deployed and working
- [ ] **Environment variables** are configured
- [ ] **User is authenticated** before upload
- [ ] **File type** is supported (CSV, PDF, DOCX, TXT)
- [ ] **File size** is under 10MB
- [ ] **Gemini API key** is valid and has quota

## 🎉 What's New

### Immediate Processing
- **No more background jobs** - insights appear instantly
- **Real-time generation** - users see results immediately
- **Live feedback** - animated indicators show processing status

### Enhanced UX
- **Streaming visual effects** - sparkle animations during processing
- **Live insight cards** - insights appear as they're generated
- **Instant metrics** - counters update in real-time

### Improved Performance
- **Direct Gemini integration** - no intermediate storage delays
- **Optimized prompts** - faster, more accurate insights
- **Better error handling** - clear feedback for all states
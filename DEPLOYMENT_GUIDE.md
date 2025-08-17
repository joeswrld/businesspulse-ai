# AI Insights Upload Integration - Deployment Guide

## Overview

This guide covers the deployment of the enhanced AI Insights page with integrated upload functionality. The implementation includes real-time file upload, AI processing, and instant insight generation.

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

## Edge Function Deployment

### 1. Deploy Edge Function
```bash
# Deploy the process-upload-to-insights function
npx supabase functions deploy process-upload-to-insights

# Verify deployment
npx supabase functions list
```

### 2. Configure Environment Variables
Set the following secrets for the Edge Function:
```bash
npx supabase secrets set GEMINI_API_KEY=your_gemini_api_key
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Test Edge Function
```bash
# Test the function locally (if Docker is available)
npx supabase functions serve process-upload-to-insights

# Or test via Supabase Dashboard
# Go to Edge Functions > process-upload-to-insights > Test
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

## Testing the Integration

### 1. Test File Upload
1. Navigate to AI Insights page
2. Click "Upload Data" button
3. Drag and drop a CSV/PDF/DOCX/TXT file
4. Verify upload progress and success message
5. Check that insights appear in real-time

### 2. Test Text Input
1. Open upload modal
2. Paste text content into textarea
3. Click "Upload & Analyze"
4. Verify insights generation

### 3. Test Real-time Updates
1. Upload content in one browser tab
2. Open AI Insights page in another tab
3. Verify insights appear automatically
4. Check that metrics update in real-time

## Troubleshooting

### Common Issues

#### 1. File Upload Fails
**Symptoms**: File upload button doesn't work or shows error
**Solutions**:
- Check Supabase storage bucket exists
- Verify RLS policies are correct
- Check file size limits (10MB max)
- Ensure user is authenticated

#### 2. No Insights Generated
**Symptoms**: Upload succeeds but no insights appear
**Solutions**:
- Check Gemini API key is configured
- Verify Edge Function is deployed
- Check Edge Function logs for errors
- Ensure content is substantial enough for analysis

#### 3. Real-time Not Working
**Symptoms**: Insights don't appear automatically
**Solutions**:
- Check Supabase Realtime is enabled
- Verify database tables have REPLICA IDENTITY FULL
- Check network connectivity
- Ensure user authentication is valid

#### 4. Edge Function Errors
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
npx supabase functions logs process-upload-to-insights
```

## Performance Optimization

### 1. File Size Limits
- Set maximum file size to 10MB
- Recommend users compress large files
- Implement client-side file validation

### 2. Processing Optimization
- Chunk large content for analysis
- Implement background processing for large files
- Add progress indicators for long operations

### 3. Real-time Optimization
- Debounce real-time updates
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
- Processing time
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

### 1. Batch Processing
- Support multiple file uploads
- Implement queue system for large batches
- Add progress tracking for batch operations

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
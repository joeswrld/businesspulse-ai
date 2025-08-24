# Production Deployment Guide - InsightsSimplePage

## 🚀 **Complete Production Setup**

### **Step 1: Environment Variables Setup**

#### **1.1 Supabase Environment Variables**
Add these to your Supabase project settings:

```bash
# Required for Edge Function
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_URL=https://your-project.supabase.co
```

#### **1.2 Get Gemini API Key**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key and add it to Supabase environment variables

#### **1.3 Get Supabase Service Role Key**
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the "service_role" key (not the anon key)

### **Step 2: Database Setup**

#### **2.1 Run the Migration**
Execute this in your Supabase SQL editor:

```sql
-- Run the fixed migration
\i create_insights_results_table_fixed.sql

-- Verify the table was created
SELECT test_insights_results_table();
```

Expected output: `SUCCESS: insights_results table is properly configured`

#### **2.2 Verify Database Setup**
```sql
-- Check table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'insights_results';

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'insights_results';

-- Check policies exist
SELECT policyname FROM pg_policies 
WHERE tablename = 'insights_results';
```

### **Step 3: Deploy Edge Function**

#### **3.1 Install Supabase CLI**
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login
```

#### **3.2 Link Your Project**
```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Initialize if needed
supabase init
```

#### **3.3 Deploy the Function**
```bash
# Deploy the analyze-insights function
supabase functions deploy analyze-insights

# Verify deployment
supabase functions list
```

#### **3.4 Test the Function**
```bash
# Test the function locally
supabase functions serve analyze-insights

# Or test deployed function
curl -X POST https://your-project.supabase.co/functions/v1/analyze-insights \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"data":"test","userId":"user-id","fileType":"text/plain"}'
```

### **Step 4: Frontend Deployment**

#### **4.1 Build the Application**
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Test the build locally
npm run preview
```

#### **4.2 Deploy to Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel --prod

# Or connect your GitHub repo to Vercel for automatic deployments
```

#### **4.3 Environment Variables in Vercel**
Add these to your Vercel project:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### **Step 5: Production Testing**

#### **5.1 Test File Upload**
1. Create a test CSV file:
```csv
name,age,city,department
John,25,New York,Engineering
Jane,30,Los Angeles,Marketing
Bob,35,Chicago,Sales
Alice,28,Boston,HR
```

2. Upload the file and verify:
- ✅ File uploads successfully
- ✅ Progress bars complete
- ✅ Real AI analysis results appear
- ✅ Results are saved to database
- ✅ History shows the analysis

#### **5.2 Test Error Scenarios**
1. **Large file** (>10MB) - Should show size limit error
2. **Invalid file type** - Should show type validation error
3. **Unauthenticated user** - Should redirect to login
4. **Usage limit reached** - Should show upgrade prompt

#### **5.3 Test History Features**
1. Upload multiple files
2. Check history tab
3. Test re-run functionality
4. Test download functionality
5. Test delete functionality

### **Step 6: Monitoring & Analytics**

#### **6.1 Set Up Monitoring**
```bash
# Monitor Edge Function logs
supabase functions logs analyze-insights

# Monitor database queries
# Check Supabase dashboard → Logs
```

#### **6.2 Key Metrics to Track**
- File upload success rate
- Analysis completion rate
- Average response time
- Error rates
- Usage patterns

#### **6.3 Set Up Alerts**
- API quota usage (Gemini)
- Database performance
- Function errors
- User authentication issues

### **Step 7: Security Hardening**

#### **7.1 CORS Configuration**
Update the Edge Function CORS headers:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com', // Replace with your domain
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
```

#### **7.2 Rate Limiting**
Add rate limiting to the Edge Function:

```typescript
// Add rate limiting logic
const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}
```

#### **7.3 Input Validation**
Enhance input validation in the Edge Function:

```typescript
// Validate file size
if (dataString.length > 1000000) { // 1MB limit
  return new Response(
    JSON.stringify({ success: false, error: 'File too large' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

### **Step 8: Performance Optimization**

#### **8.1 Database Optimization**
```sql
-- Add additional indexes for better performance
CREATE INDEX idx_insights_results_user_created ON insights_results(user_id, created_at DESC);
CREATE INDEX idx_insights_results_file_name ON insights_results(file_name);

-- Add partitioning for large datasets
-- (Consider if you expect >1M records)
```

#### **8.2 Caching Strategy**
```typescript
// Add caching for repeated analyses
const cacheKey = `${userId}-${fileHash}`;
const cachedResult = await redis.get(cacheKey);
if (cachedResult) {
  return JSON.parse(cachedResult);
}
```

#### **8.3 CDN Configuration**
- Configure Vercel CDN for static assets
- Enable edge caching for API responses
- Optimize image and file delivery

### **Step 9: Backup & Recovery**

#### **9.1 Database Backups**
```sql
-- Set up automated backups in Supabase
-- Go to Settings → Database → Backups
-- Enable point-in-time recovery
```

#### **9.2 Function Versioning**
```bash
# Tag function versions
supabase functions deploy analyze-insights --version 1.0.0

# Rollback if needed
supabase functions deploy analyze-insights --version 1.0.0
```

#### **9.3 Environment Backup**
- Export environment variables
- Document all configuration
- Store secrets securely

### **Step 10: Documentation & Support**

#### **10.1 User Documentation**
Create user guides for:
- How to upload files
- Understanding analysis results
- Managing analysis history
- Troubleshooting common issues

#### **10.2 API Documentation**
Document the Edge Function API:
- Endpoint: `/functions/v1/analyze-insights`
- Method: POST
- Authentication: JWT Bearer token
- Request/Response format
- Error codes

#### **10.3 Support System**
- Set up error tracking (Sentry)
- Create support tickets system
- Document common issues and solutions

## 🎯 **Production Checklist**

### **✅ Pre-Deployment**
- [ ] Environment variables configured
- [ ] Database migration run successfully
- [ ] Edge Function deployed and tested
- [ ] Frontend built and tested
- [ ] Security configurations applied

### **✅ Post-Deployment**
- [ ] File upload works
- [ ] AI analysis completes successfully
- [ ] Results are saved to database
- [ ] History functionality works
- [ ] Error handling works correctly
- [ ] Performance is acceptable

### **✅ Monitoring**
- [ ] Logs are being collected
- [ ] Metrics are being tracked
- [ ] Alerts are configured
- [ ] Backup system is working

### **✅ Security**
- [ ] CORS is properly configured
- [ ] Rate limiting is active
- [ ] Input validation is working
- [ ] Authentication is secure

## 🚨 **Troubleshooting Production Issues**

### **Common Production Issues:**

**1. Edge Function Timeout**
- Increase function timeout
- Optimize analysis logic
- Add progress indicators

**2. Database Connection Issues**
- Check connection pool settings
- Monitor database performance
- Scale database if needed

**3. API Rate Limits**
- Monitor Gemini API usage
- Implement request queuing
- Add usage alerts

**4. Memory Issues**
- Optimize file processing
- Add memory limits
- Monitor function memory usage

## 🎉 **Go Live!**

Once all steps are completed:

1. **Announce the feature** to your users
2. **Monitor closely** for the first 24 hours
3. **Collect feedback** and iterate
4. **Scale as needed** based on usage

**Your InsightsSimplePage is now production-ready! 🚀**
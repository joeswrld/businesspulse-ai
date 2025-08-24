# InsightsSimplePage Setup Guide

## 🚀 **Overview**

The InsightsSimplePage is a fully functional AI-powered file analysis system that allows users to:
- Upload various file formats (PDF, CSV, Excel, TXT, JSON)
- Get comprehensive AI analysis using Gemini AI
- View analysis history with re-run and download capabilities
- Track usage and enforce plan limits

## 📋 **Features**

### **File Upload & Processing**
- ✅ Drag & drop file upload
- ✅ Support for PDF, CSV, Excel, TXT, JSON files
- ✅ File validation (type and size limits)
- ✅ Progress indicators for upload and analysis

### **AI Analysis**
- ✅ Comprehensive Summary
- ✅ Key Themes identification
- ✅ Suggested Actions
- ✅ Trends analysis
- ✅ Performance Metrics
- ✅ Sentiment Analysis

### **Data Storage**
- ✅ Supabase integration for secure storage
- ✅ User-specific data isolation
- ✅ Analysis history management
- ✅ Row Level Security (RLS)

### **User Experience**
- ✅ Tabbed interface (Upload & History)
- ✅ Loading states and error handling
- ✅ Download analysis as JSON
- ✅ Re-run previous analyses
- ✅ Usage tracking and limits

## 🛠 **Setup Requirements**

### **1. Environment Variables**

Add these to your `.env` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key
```

### **2. Database Setup**

Run the SQL migration to create the required table:

```sql
-- Run this in your Supabase SQL editor
\i create_insights_results_table_fixed.sql
```

### **3. Supabase Edge Function**

Deploy the Edge Function for AI analysis:

```bash
# Navigate to the function directory
cd supabase/functions/analyze-insights

# Deploy the function
supabase functions deploy analyze-insights
```

### **4. Dependencies**

Ensure these packages are installed:

```bash
npm install @google/generative-ai @supabase/supabase-js
```

## 📁 **File Structure**

```
src/
├── pages/
│   └── InsightsSimplePage.tsx          # Main component
├── hooks/
│   ├── useUsageEnforcement.ts          # Usage limits
│   └── useUsageTracking.ts             # Usage tracking
├── lib/
│   └── usageEnforcement.ts             # Usage enforcement logic
└── integrations/
    └── supabase/
        └── client.ts                   # Supabase client

supabase/
└── functions/
    └── analyze-insights/
        └── index.ts                    # Edge Function

sql/
└── create_insights_results_table_fixed.sql   # Database migration
```

## 🔧 **Configuration**

### **Usage Limits**

The system enforces usage limits based on user plans:

```typescript
const planLimits = {
  free: 5,        // 5 analyses per month
  pro: 50,        // 50 analyses per month
  business: -1,   // Unlimited
  enterprise: -1  // Unlimited
}
```

### **File Validation**

Supported file types and limits:

```typescript
const allowedTypes = [
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
];

const maxSize = 10 * 1024 * 1024; // 10MB
```

## 🚀 **Usage**

### **Basic Usage**

```tsx
import InsightsSimplePage from '@/pages/InsightsSimplePage';

// In your router
<Route path="/insights-simple" element={<InsightsSimplePage />} />
```

### **API Integration**

The component automatically:
1. Validates user authentication
2. Checks usage limits
3. Processes file uploads
4. Calls Gemini AI for analysis
5. Stores results in Supabase
6. Updates usage tracking

## 🔒 **Security**

### **Authentication**
- JWT token validation
- User-specific data access
- Row Level Security (RLS) policies

### **Data Protection**
- File content is processed securely
- No sensitive data is logged
- User data isolation

### **Rate Limiting**
- Usage-based limits per plan
- Prevents abuse and ensures fair usage

## 📊 **Database Schema**

### **insights_results Table**

```sql
CREATE TABLE insights_results (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    file_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_themes TEXT[] NOT NULL,
    suggested_actions TEXT[] NOT NULL,
    trends TEXT[] NOT NULL,
    performance JSONB NOT NULL,
    sentiment JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

## 🧪 **Testing**

### **Test File Upload**

1. Create a test CSV file:
```csv
name,age,city
John,25,New York
Jane,30,Los Angeles
Bob,35,Chicago
```

2. Upload the file and verify:
- File validation works
- Progress indicators show
- Analysis results are displayed
- Results are saved to database

### **Test Usage Limits**

1. Create a free user account
2. Upload 5 files (should work)
3. Try to upload a 6th file (should be blocked)
4. Verify upgrade prompt appears

### **Test History**

1. Upload multiple files
2. Navigate to History tab
3. Verify all analyses are listed
4. Test re-run functionality
5. Test download functionality

## 🐛 **Troubleshooting**

### **Common Issues**

**1. "Unauthorized" Error**
- Check if user is authenticated
- Verify JWT token is valid
- Ensure Supabase client is configured

**2. "Usage limit reached" Error**
- Check user's current plan
- Verify usage tracking is working
- Consider upgrading user's plan

**3. "Failed to parse AI response" Error**
- Check Gemini API key is valid
- Verify API quota is not exceeded
- Check network connectivity

**4. File upload fails**
- Verify file type is supported
- Check file size is under 10MB
- Ensure user is authenticated

### **Debug Mode**

Enable debug logging by adding to your environment:

```bash
DEBUG=true
```

## 📈 **Performance**

### **Optimizations**

1. **File Processing**: Files are processed client-side to reduce server load
2. **Caching**: Analysis results are cached in Supabase
3. **Pagination**: History is paginated to handle large datasets
4. **Progress Indicators**: Real-time feedback during processing

### **Monitoring**

Monitor these metrics:
- File upload success rate
- AI analysis response time
- Usage tracking accuracy
- Error rates

## 🔄 **Updates & Maintenance**

### **Regular Tasks**

1. **Monitor API Usage**: Check Gemini AI quota usage
2. **Database Maintenance**: Clean up old analysis results
3. **Security Updates**: Keep dependencies updated
4. **Performance Monitoring**: Track response times

### **Backup Strategy**

- Database backups via Supabase
- Edge Function version control
- Environment variable management

## 📞 **Support**

For issues or questions:
1. Check the troubleshooting section
2. Review error logs
3. Verify configuration
4. Test with sample data

## 🎯 **Next Steps**

Potential enhancements:
- [ ] PDF text extraction
- [ ] Excel data parsing
- [ ] Batch file processing
- [ ] Advanced analytics
- [ ] Export to different formats
- [ ] Integration with other AI models
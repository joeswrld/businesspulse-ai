# Upload Page Fix & AI Insights Implementation

This document provides step-by-step instructions to fix the Upload Page ENUM constraint error and implement the complete AI insights flow.

## 🔧 Database Setup

### Step 1: Run the SQL Migration

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/fix_upload_enum.sql`
4. Click "Run" to execute the migration

This will:
- ✅ Fix the `data_sources_type_check` ENUM constraint error
- ✅ Create the new `insights` table with proper structure
- ✅ Set up Row Level Security (RLS) policies
- ✅ Enable real-time subscriptions
- ✅ Add necessary indexes for performance

## 🚀 Edge Functions Deployment

### Step 2: Deploy Edge Functions

Since the Supabase CLI isn't available in this environment, you'll need to deploy the Edge Functions manually:

1. **Install Supabase CLI** (if not already installed):
   ```bash
   # On macOS
   brew install supabase/tap/supabase
   
   # On Windows
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   
   # On Linux
   curl -fsSL https://supabase.com/install.sh | sh
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. **Deploy the functions**:
   ```bash
   supabase functions deploy generate-insights
   ```

## 🔑 Environment Variables

### Step 3: Configure Environment Variables

In your Supabase Dashboard, go to Settings > Edge Functions and add:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

To get a Gemini API key:
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy and paste it into the environment variable

## 📱 Frontend Changes

### Step 4: Updated Components

The following components have been updated:

#### ✅ DataUpload.tsx
- **Fixed ENUM constraint error** by mapping file types to valid ENUM values
- **Added fallback logic** for invalid types with user-friendly error messages
- **Implemented real-time AI processing** with Gemini API
- **Added loading states** for upload and AI generation
- **Automatic redirect** to AI Insights page after successful upload

#### ✅ AIInsights.tsx
- **Complete rewrite** to work with new insights table structure
- **Priority-based tabs** (High/Medium/Low) for better organization
- **Real-time updates** via Supabase subscriptions
- **Improved UI** with better visual hierarchy and loading states

#### ✅ useRealtime.ts
- **New hook** for real-time insights data
- **Automatic refresh** when new insights are generated
- **Error handling** and loading states

## 🔄 Complete Flow

### Upload Process:
1. **User uploads file/text** → DataUpload component
2. **File type mapping** → Maps to valid ENUM values (analytics/feedback)
3. **Storage upload** → File saved to Supabase Storage
4. **Data source creation** → Record created in data_sources table
5. **AI processing** → Edge Function calls Gemini API
6. **Insights generation** → Structured insights saved to insights table
7. **Real-time update** → AI Insights page shows new insights immediately
8. **User redirect** → Automatically navigated to AI Insights page

### Error Handling:
- ✅ **Invalid file type** → Shows "Invalid data type. Please select a valid category."
- ✅ **Upload failure** → Shows specific error message
- ✅ **AI processing failure** → Graceful fallback with default insight
- ✅ **Network issues** → Retry logic and user feedback

## 🎯 Key Features Implemented

### ✅ ENUM Constraint Fix
- Maps file types to valid ENUM values
- Fallback to 'analytics' if type is invalid
- User-friendly error messages

### ✅ AI Integration
- Gemini API integration via Edge Functions
- Structured insight generation
- Real-time processing and updates

### ✅ Real-time Updates
- Supabase subscriptions for live data
- Automatic UI updates when new insights arrive
- Loading states and progress indicators

### ✅ User Experience
- Priority-based organization (High/Medium/Low)
- Search and filtering capabilities
- Responsive design with modern UI
- Automatic navigation after upload

### ✅ Error Handling
- Comprehensive error messages
- Graceful fallbacks
- Loading states and progress indicators

## 🧪 Testing

### Test the Upload Flow:
1. **Upload a text file** → Should work with 'analytics' type
2. **Upload a PDF** → Should work with 'feedback' type
3. **Upload invalid type** → Should show error message
4. **Check AI Insights** → Should show generated insights in real-time

### Test Error Scenarios:
1. **No file selected** → Should show validation error
2. **Network failure** → Should show retry option
3. **Invalid file type** → Should show type error message

## 📊 Expected Results

After implementation, you should see:

1. **No more ENUM constraint errors** when uploading files
2. **Real-time AI insights** appearing on the AI Insights page
3. **Priority-based organization** of insights (High/Medium/Low tabs)
4. **Automatic navigation** from upload to insights page
5. **Loading states** during upload and AI processing
6. **Error messages** for invalid file types or upload failures

## 🔧 Troubleshooting

### Common Issues:

1. **ENUM constraint still failing**:
   - Check that the SQL migration ran successfully
   - Verify the data_sources table structure

2. **Edge Function not working**:
   - Ensure GEMINI_API_KEY is set in environment variables
   - Check Edge Function logs in Supabase Dashboard

3. **Real-time not working**:
   - Verify tables are added to realtime publication
   - Check RLS policies are correctly set

4. **Upload not redirecting**:
   - Check browser console for errors
   - Verify navigation path is correct

## 📝 Next Steps

After completing this setup:

1. **Test the complete flow** with different file types
2. **Monitor Edge Function logs** for any issues
3. **Customize the AI prompts** in the generate-insights function
4. **Add more file type mappings** as needed
5. **Enhance the insights UI** with additional features

## 🎉 Success Criteria

The implementation is successful when:
- ✅ Upload page works without ENUM constraint errors
- ✅ Files are processed and insights are generated
- ✅ AI Insights page shows real-time updates
- ✅ Users can navigate between priority tabs
- ✅ Error messages are user-friendly and actionable
- ✅ Loading states provide good user feedback

---

**Note**: If you encounter any issues during setup, check the Supabase Dashboard logs and Edge Function logs for detailed error messages.
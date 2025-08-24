# File Upload Troubleshooting Guide

## 🚨 **Common Issues & Solutions**

### **Issue 1: "Failed to process file. Please try again."**

#### **Possible Causes:**
1. **Edge Function not deployed**
2. **Authentication issues**
3. **Database table not created**
4. **Network connectivity problems**
5. **File validation failures**

#### **Solutions:**

**✅ Solution 1: Use Debug Mode**
1. Click the "Debug" button in the top-right corner
2. Check the debug information for:
   - User ID (should not be "Not authenticated")
   - Supabase URL (should be valid)
   - File information
   - Error messages

**✅ Solution 2: Check Database Setup**
```sql
-- Run this in Supabase SQL editor to verify table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'insights_results';

-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'insights_results';
```

**✅ Solution 3: Verify Authentication**
- Make sure you're logged in
- Check if your session is valid
- Try logging out and back in

**✅ Solution 4: Test with Demo Analysis**
The system now includes a fallback to demo analysis when the Edge Function is unavailable. This means:
- You'll still get analysis results
- They'll be demo data based on your file
- The system will work even without the Edge Function deployed

### **Issue 2: "Analysis failed: [Error Message]"**

#### **Common Error Messages:**

**"Usage limit reached"**
- ✅ Upgrade your plan or wait for reset
- ✅ Check your current usage in the billing page

**"Authentication session not found"**
- ✅ Log out and log back in
- ✅ Check if your session expired

**"Edge Function not available"**
- ✅ This is normal - the system will use demo analysis
- ✅ You'll still get results, just not from Gemini AI

**"Failed to save results"**
- ✅ Analysis completed but database save failed
- ✅ Results are still displayed
- ✅ Check database permissions

### **Issue 3: File Upload Validation Errors**

#### **File Type Issues:**
```
"Invalid file type. Please upload PDF, CSV, Excel, TXT, or JSON files."
```

**Supported File Types:**
- ✅ PDF (.pdf)
- ✅ CSV (.csv)
- ✅ Excel (.xlsx, .xls)
- ✅ Text (.txt)
- ✅ JSON (.json)
- ✅ Word (.doc, .docx)

#### **File Size Issues:**
```
"File too large. Maximum size is 10MB."
```

**Solutions:**
- ✅ Compress your file
- ✅ Split large files into smaller chunks
- ✅ Use a different file format

### **Issue 4: No Analysis Results Displayed**

#### **Check These:**
1. **File was uploaded successfully** (progress bar completed)
2. **Analysis completed** (progress bar reached 100%)
3. **No error messages** in the error section
4. **Results section is visible** (scroll down if needed)

#### **Debug Steps:**
1. Click "Debug" button
2. Check "Is Uploading" and "Is Analyzing" status
3. Look for any error messages
4. Verify file information is correct

## 🔧 **Technical Debugging**

### **Browser Console Errors**
1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for error messages
4. Check Network tab for failed requests

### **Common Console Messages:**

**✅ Normal Messages:**
```
"Edge Function error, using mock analysis: [error]"
"Failed to save to database, but analysis completed: [error]"
```

**❌ Problem Messages:**
```
"Failed to fetch"
"Network error"
"Authentication failed"
```

### **Network Tab Analysis**
1. Look for requests to `/functions/v1/analyze-insights`
2. Check response status codes:
   - 200: Success
   - 401: Authentication error
   - 404: Function not found
   - 500: Server error

## 🚀 **Quick Fixes**

### **Fix 1: Reset Everything**
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
// Then refresh the page
```

### **Fix 2: Check Supabase Connection**
```javascript
// In browser console
console.log('Supabase URL:', supabase.supabaseUrl);
console.log('User:', supabase.auth.getUser());
```

### **Fix 3: Test File Upload**
1. Create a simple test file:
```csv
name,age,city
John,25,New York
Jane,30,Los Angeles
```

2. Save as `test.csv`
3. Try uploading this file
4. Check if it works

## 📋 **Step-by-Step Testing**

### **Test 1: Basic Upload**
1. ✅ Create a simple CSV file
2. ✅ Log in to the application
3. ✅ Go to `/insights-simple`
4. ✅ Upload the file
5. ✅ Check if analysis completes

### **Test 2: Debug Information**
1. ✅ Click "Debug" button
2. ✅ Verify all information is correct
3. ✅ Check for any error messages
4. ✅ Monitor progress indicators

### **Test 3: Database Integration**
1. ✅ Upload a file successfully
2. ✅ Go to "Analysis History" tab
3. ✅ Check if the analysis appears in history
4. ✅ Try re-running the analysis

## 🎯 **Expected Behavior**

### **Successful Upload Flow:**
1. **File Selection** → File appears in upload area
2. **Validation** → File type and size checked
3. **Upload Progress** → Progress bar fills to 100%
4. **Analysis Progress** → Progress bar fills to 100%
5. **Results Display** → Analysis results appear in cards
6. **Success Message** → "Analysis completed successfully!"

### **Demo Analysis Flow:**
1. **File Upload** → Same as above
2. **Edge Function Error** → "AI analysis service temporarily unavailable"
3. **Demo Analysis** → Mock analysis generated
4. **Results Display** → Demo results appear
5. **Success Message** → "Demo analysis completed successfully!"

## 🔍 **Advanced Debugging**

### **Check Environment Variables**
Make sure these are set in your Supabase project:
- `GEMINI_API_KEY` (for real AI analysis)
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

### **Verify Edge Function**
```bash
# Check if function is deployed
supabase functions list

# Deploy if needed
supabase functions deploy analyze-insights
```

### **Database Permissions**
```sql
-- Check if user has proper permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'insights_results';
```

## 📞 **Getting Help**

### **Information to Provide:**
1. **Error message** (exact text)
2. **File type and size**
3. **Debug information** (click Debug button)
4. **Browser console errors**
5. **Steps to reproduce**

### **Common Solutions:**
- ✅ **Demo mode works** - Use this for testing
- ✅ **Database issues** - Check table creation
- ✅ **Authentication issues** - Re-login
- ✅ **File issues** - Try different file format/size

## 🎉 **Success Indicators**

You'll know everything is working when:
- ✅ File uploads without errors
- ✅ Progress bars complete
- ✅ Analysis results are displayed
- ✅ Success message appears
- ✅ Results are saved to history
- ✅ You can re-run analyses
- ✅ You can download results

**The system is designed to work even without the Edge Function deployed, using demo analysis as a fallback!**
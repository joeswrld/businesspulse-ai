# 🚨 "Bucket not found" Error - Quick Fix Guide

## The Problem
You're getting this error when trying to upload files:
```
Upload failed: bucket not found
```

This happens because Supabase doesn't automatically create storage buckets - you need to create the `uploads` bucket manually.

## ✅ Quick Fix (Choose One)

### Option 1: Manual Creation (Easiest)
1. **Go to Supabase Dashboard**
2. **Navigate to Storage > Buckets**
3. **Click "New Bucket"**
4. **Set bucket name**: `uploads`
5. **Set Public**: `false` (for security)
6. **Click "Create bucket"**

That's it! Your uploads should work now.

### Option 2: Run the Script
```bash
# Set your environment variables
export VITE_SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run the bucket creation script
node scripts/create-uploads-bucket.js
```

### Option 3: SQL Commands
Run this in your **Supabase SQL Editor**:

```sql
-- Create the uploads bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their own files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Service role can access all files"
ON storage.objects
FOR ALL
USING (bucket_id = 'uploads' AND auth.role() = 'service_role');
```

## 🔍 Verify It's Working

After creating the bucket:

1. **Check the bucket exists**:
   - Go to Supabase Dashboard > Storage > Buckets
   - You should see an `uploads` bucket

2. **Test upload**:
   - Go to your AI Insights page
   - Click "Upload Data"
   - Try uploading a file
   - Should work without the "bucket not found" error

## 🐛 Still Having Issues?

### Check These:
- [ ] Bucket name is exactly `uploads` (lowercase)
- [ ] Bucket is set to `private` (not public)
- [ ] You're logged in to your app
- [ ] File type is supported (CSV, PDF, DOCX, TXT)
- [ ] File size is under 10MB

### Common Mistakes:
- ❌ Bucket name: `Uploads` (should be `uploads`)
- ❌ Bucket name: `upload` (should be `uploads`)
- ❌ Bucket is public (should be private)
- ❌ Not logged in when uploading

## 📞 Need Help?

If you're still stuck:
1. Check the full [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
2. Look at the [AI_INSIGHTS_UPLOAD_README.md](./AI_INSIGHTS_UPLOAD_README.md)
3. Check Supabase documentation on storage buckets

## 🎉 Success!

Once the bucket is created, your upload flow will work:
1. **Upload file** → Supabase Storage
2. **Process content** → Edge Function + Gemini AI
3. **Generate insights** → Real-time updates
4. **View results** → Instant insights on page

The bucket creation is a one-time setup - after this, everything should work smoothly!
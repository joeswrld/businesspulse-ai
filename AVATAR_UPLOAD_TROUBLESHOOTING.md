# 🔧 Avatar Upload Troubleshooting Guide

## 🚨 **Problem: Logo Upload Failed in Settings Page**

The avatar upload is failing because the required Supabase storage bucket and policies are not set up. Here's how to fix it:

## ✅ **Step-by-Step Solution**

### **1. Create the Storage Bucket**

Go to your **Supabase Dashboard** → **Storage** → **Create a new bucket**:

- **Bucket name**: `avatars`
- **Public bucket**: ✅ Check this box
- **File size limit**: `5MB`
- **Allowed MIME types**: `image/*`

### **2. Set Up Storage Policies**

After creating the bucket, go to **SQL Editor** and run these commands:

```sql
-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can view their own avatar
CREATE POLICY "Users can view their own avatar" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Alternative: Allow all authenticated users to view avatars (for public profiles)
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
```

### **3. Verify Bucket Creation**

Check that the bucket was created successfully:
- Go to **Storage** in your Supabase dashboard
- You should see an `avatars` bucket listed
- Click on it to see the policies and files

## 🔍 **What Was Fixed in the Code**

### **Enhanced Error Handling**
- **File validation**: Checks file type and size before upload
- **Bucket verification**: Confirms storage bucket exists before attempting upload
- **Specific error messages**: Provides clear feedback on what went wrong
- **Console logging**: Adds detailed logs for debugging

### **File Validation**
- **File types**: Only allows JPG, PNG, GIF, WebP
- **File size**: Maximum 5MB limit
- **User feedback**: Shows success/error messages for file selection

### **Upload Process**
- **Bucket existence check**: Verifies storage bucket before upload
- **Better error handling**: Catches and reports specific upload errors
- **Profile update**: Ensures avatar URL is saved to profiles table
- **Data refresh**: Reloads profile data after successful upload

## 🧪 **Testing the Fix**

### **1. Test File Selection**
- Go to `/settings` page
- Click on the camera icon or avatar area
- Select a valid image file (JPG, PNG, GIF, WebP)
- Should see "File selected successfully!" message

### **2. Test Upload**
- Click the "Upload" button
- Should see upload progress
- Should see "Profile picture updated successfully!" message
- Avatar should appear in the profile picture area

### **3. Test Error Cases**
- Try uploading a file larger than 5MB
- Try uploading a non-image file
- Should see appropriate error messages

## 🚨 **Common Error Messages & Solutions**

### **"Storage bucket not found"**
- **Solution**: Create the `avatars` bucket in Supabase Storage

### **"Upload permission denied"**
- **Solution**: Run the storage policies SQL commands

### **"File size too large"**
- **Solution**: Use an image smaller than 5MB

### **"Invalid file type"**
- **Solution**: Use JPG, PNG, GIF, or WebP format

### **"Network error"**
- **Solution**: Check internet connection and try again

## 📱 **File Requirements**

### **Supported Formats**
- ✅ JPEG (.jpg, .jpeg)
- ✅ PNG (.png)
- ✅ GIF (.gif)
- ✅ WebP (.webp)

### **Size Limits**
- ✅ Maximum: 5MB
- ✅ Recommended: 1-2MB for best performance

### **Image Dimensions**
- ✅ Any size (will be resized to 128x128px in profile)
- ✅ Recommended: Square images (1:1 aspect ratio)

## 🔧 **Manual Testing Steps**

1. **Create Storage Bucket**
   - Supabase Dashboard → Storage → Create bucket
   - Name: `avatars`, Public: ✅, Size limit: 5MB

2. **Set Up Policies**
   - SQL Editor → Run the policy creation commands

3. **Test Upload**
   - Settings page → Select image → Upload
   - Check console for any error messages

4. **Verify Success**
   - Avatar should appear in profile picture
   - Check Supabase Storage for uploaded file
   - Check profiles table for avatar_url update

## 🎯 **If Still Having Issues**

### **Check Console Logs**
- Open browser developer tools
- Look for error messages in Console tab
- Check Network tab for failed requests

### **Verify Supabase Setup**
- Check that storage is enabled in your project
- Verify RLS is enabled on storage.objects
- Confirm bucket policies are active

### **Test with Simple Image**
- Use a small (under 1MB) JPG file
- Ensure it's a valid image file
- Try different browsers/devices

## 🎉 **Expected Result**

After following these steps, you should be able to:
- ✅ Select image files from your device
- ✅ Upload them to Supabase storage
- ✅ See them displayed in your profile
- ✅ Have them persist across sessions
- ✅ Share them publicly (if bucket is public)

The avatar upload should now work smoothly with proper error handling and user feedback! 🚀
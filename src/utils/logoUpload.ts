import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadLogoResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

interface UploadLogoOptions {
  file: File;
  userId: string;
  onProgress?: (progress: number) => void;
}

/**
 * Uploads a logo file to the business-logos Supabase storage bucket
 * 
 * @param options - Upload options including file, userId, and optional progress callback
 * @returns Promise<UploadLogoResult> - Result object with success status, public URL, or error
 */
export const uploadLogo = async (options: UploadLogoOptions): Promise<UploadLogoResult> => {
  const { file, userId, onProgress } = options;

  console.log('🚀 Starting logo upload process...', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    userId: userId
  });

  try {
    // 1. Ensure user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Authentication error:', authError);
      return {
        success: false,
        error: 'Authentication failed. Please log in and try again.'
      };
    }

    if (!user) {
      console.error('❌ No authenticated user found');
      return {
        success: false,
        error: 'You must be logged in to upload a logo.'
      };
    }

    console.log('✅ User authenticated:', { userId: user.id, email: user.email });

    // 2. Validate file
    const validationResult = validateLogoFile(file);
    if (!validationResult.isValid) {
      console.error('❌ File validation failed:', validationResult.error);
      return {
        success: false,
        error: validationResult.error
      };
    }

    console.log('✅ File validation passed');

    // 3. Check if business-logos bucket exists
    console.log('🔍 Checking if business-logos bucket exists...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error checking storage buckets:', bucketError);
      return {
        success: false,
        error: 'Storage service unavailable. Please try again later.'
      };
    }

    const businessLogosBucket = buckets.find(bucket => bucket.name === 'business-logos');
    if (!businessLogosBucket) {
      console.error('❌ business-logos bucket not found. Available buckets:', buckets.map(b => b.name));
      return {
        success: false,
        error: 'Logo storage not configured. Please contact support to set up the business-logos bucket.'
      };
    }

    console.log('✅ business-logos bucket found:', {
      id: businessLogosBucket.id,
      name: businessLogosBucket.name,
      public: businessLogosBucket.public
    });

    // 4. Prepare file path and metadata
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `logo.${fileExtension}`;
    const filePath = `${userId}/${fileName}`;

    console.log('📁 Upload path prepared:', {
      filePath,
      fileName,
      fileExtension,
      originalFileName: file.name
    });

    // 5. Upload file to Supabase storage
    console.log('⬆️ Starting file upload to Supabase storage...');
    
    const uploadOptions = {
      cacheControl: '3600', // Cache for 1 hour
      upsert: true, // Allow overwriting existing files
      contentType: file.type
    };

    console.log('📤 Upload options:', uploadOptions);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('business-logos')
      .upload(filePath, file, uploadOptions);

    if (uploadError) {
      console.error('❌ Upload error details:', {
        error: uploadError,
        message: uploadError.message,
        statusCode: (uploadError as any).statusCode,
        errorCode: (uploadError as any).error
      });

      // Provide specific error messages based on the error
      let errorMessage = 'Failed to upload logo. Please try again.';
      
      if (uploadError.message.includes('bucket')) {
        errorMessage = 'Storage bucket not found. Please contact support.';
      } else if (uploadError.message.includes('policy') || uploadError.message.includes('permission')) {
        errorMessage = 'Upload permission denied. Please contact support.';
      } else if (uploadError.message.includes('size') || uploadError.message.includes('too large')) {
        errorMessage = 'File size too large. Please select a smaller image (max 5MB).';
      } else if (uploadError.message.includes('type') || uploadError.message.includes('format')) {
        errorMessage = 'Invalid file format. Please select a JPG, PNG, GIF, or WebP image.';
      } else if (uploadError.message.includes('quota') || uploadError.message.includes('limit')) {
        errorMessage = 'Storage quota exceeded. Please contact support.';
      } else if (uploadError.message.includes('network') || uploadError.message.includes('timeout')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = `Upload failed: ${uploadError.message}`;
      }

      return {
        success: false,
        error: errorMessage
      };
    }

    console.log('✅ File uploaded successfully:', uploadData);

    // 6. Get public URL
    console.log('🔗 Getting public URL...');
    const { data: { publicUrl } } = supabase.storage
      .from('business-logos')
      .getPublicUrl(filePath);

    console.log('✅ Public URL generated:', publicUrl);

    // 7. Verify the file is accessible
    console.log('🔍 Verifying file accessibility...');
    try {
      const response = await fetch(publicUrl, { method: 'HEAD' });
      if (!response.ok) {
        console.warn('⚠️ File may not be publicly accessible:', {
          status: response.status,
          statusText: response.statusText,
          url: publicUrl
        });
      } else {
        console.log('✅ File is publicly accessible');
      }
    } catch (fetchError) {
      console.warn('⚠️ Could not verify file accessibility:', fetchError);
    }

    console.log('🎉 Logo upload completed successfully!', {
      filePath,
      publicUrl,
      fileSize: file.size,
      uploadTime: new Date().toISOString()
    });

    return {
      success: true,
      publicUrl: publicUrl
    };

  } catch (error) {
    console.error('💥 Unexpected error during logo upload:', error);
    
    let errorMessage = 'An unexpected error occurred. Please try again.';
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Upload timeout. Please try again with a smaller image.';
      } else if (error.message.includes('quota')) {
        errorMessage = 'Storage quota exceeded. Please contact support.';
      } else {
        errorMessage = `Upload failed: ${error.message}`;
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Validates a logo file for size, type, and other requirements
 */
const validateLogoFile = (file: File): { isValid: boolean; error?: string } => {
  console.log('🔍 Validating file:', {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified).toISOString()
  });

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxSizeInMB = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `File size (${sizeInMB}MB) exceeds the maximum allowed size of ${maxSizeInMB}MB. Please select a smaller image.`
    };
  }

  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Please select a valid image file (JPG, PNG, GIF, or WebP).'
    };
  }

  // Check file extension
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: 'Invalid file extension. Please select a file with .jpg, .jpeg, .png, .gif, or .webp extension.'
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'The selected file is empty. Please select a valid image file.'
    };
  }

  console.log('✅ File validation passed');
  return { isValid: true };
};

/**
 * Deletes a logo from the business-logos bucket
 */
export const deleteLogo = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  console.log('🗑️ Starting logo deletion for user:', userId);

  try {
    // Ensure user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication error during deletion:', authError);
      return {
        success: false,
        error: 'Authentication failed. Please log in and try again.'
      };
    }

    // Only allow users to delete their own logos
    if (user.id !== userId) {
      console.error('❌ Unauthorized deletion attempt:', { userId, currentUser: user.id });
      return {
        success: false,
        error: 'You can only delete your own logo.'
      };
    }

    const filePath = `${userId}/logo.png`; // Try PNG first
    console.log('🗑️ Attempting to delete file:', filePath);

    const { error: deleteError } = await supabase.storage
      .from('business-logos')
      .remove([filePath]);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      
      // Try other common extensions
      const extensions = ['jpg', 'jpeg', 'gif', 'webp'];
      for (const ext of extensions) {
        const altPath = `${userId}/logo.${ext}`;
        console.log('🔄 Trying alternative path:', altPath);
        
        const { error: altDeleteError } = await supabase.storage
          .from('business-logos')
          .remove([altPath]);
        
        if (!altDeleteError) {
          console.log('✅ Logo deleted successfully from alternative path:', altPath);
          return { success: true };
        }
      }
      
      return {
        success: false,
        error: `Failed to delete logo: ${deleteError.message}`
      };
    }

    console.log('✅ Logo deleted successfully');
    return { success: true };

  } catch (error) {
    console.error('💥 Unexpected error during logo deletion:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while deleting the logo.'
    };
  }
};

/**
 * Gets the current logo URL for a user
 */
export const getLogoUrl = (userId: string): string => {
  const { data: { publicUrl } } = supabase.storage
    .from('business-logos')
    .getPublicUrl(`${userId}/logo.png`);
  
  return publicUrl;
};

/**
 * Checks if a logo exists for a user
 */
export const checkLogoExists = async (userId: string): Promise<boolean> => {
  try {
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    
    for (const ext of extensions) {
      const filePath = `${userId}/logo.${ext}`;
      const { data, error } = await supabase.storage
        .from('business-logos')
        .list(userId, {
          search: `logo.${ext}`
        });
      
      if (!error && data && data.length > 0) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking logo existence:', error);
    return false;
  }
};
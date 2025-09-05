import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { uploadLogo, deleteLogo, getLogoUrl } from '@/utils/logoUpload';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Example component showing how to use the logo upload functions directly
 * This is for reference - you can use this pattern in your own components
 */
const LogoUploadExample: React.FC = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    
    try {
      const result = await uploadLogo({
        file,
        userId: user.id
      });

      if (result.success && result.publicUrl) {
        setLogoUrl(result.publicUrl);
        toast.success('Logo uploaded successfully!');
        console.log('Logo URL:', result.publicUrl);
      } else {
        toast.error(result.error || 'Failed to upload logo');
        console.error('Upload failed:', result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!user) return;

    try {
      const result = await deleteLogo(user.id);
      
      if (result.success) {
        setLogoUrl(null);
        toast.success('Logo deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete logo');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const getCurrentLogoUrl = () => {
    if (!user) return null;
    return getLogoUrl(user.id);
  };

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-xl font-bold">Logo Upload Example</h2>
      
      {/* File Input */}
      <div>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={uploading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      {/* Upload Button */}
      <Button 
        onClick={() => document.querySelector('input[type="file"]')?.click()}
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : 'Select Logo File'}
      </Button>

      {/* Current Logo Display */}
      {logoUrl && (
        <div className="space-y-2">
          <img 
            src={logoUrl} 
            alt="Current logo" 
            className="max-w-xs border rounded"
          />
          <Button onClick={handleDeleteLogo} variant="destructive">
            Delete Logo
          </Button>
        </div>
      )}

      {/* Get Logo URL Button */}
      <Button 
        onClick={() => {
          const url = getCurrentLogoUrl();
          if (url) {
            console.log('Current logo URL:', url);
            toast.success('Logo URL logged to console');
          } else {
            toast.error('No logo found');
          }
        }}
        variant="outline"
      >
        Get Current Logo URL
      </Button>
    </div>
  );
};

export default LogoUploadExample;
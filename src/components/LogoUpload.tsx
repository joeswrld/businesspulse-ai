import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Image, 
  Check, 
  X, 
  AlertCircle, 
  RefreshCw,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadLogo, deleteLogo, getLogoUrl, checkLogoExists } from '@/utils/logoUpload';
import { useAuth } from '@/contexts/AuthContext';

interface LogoUploadProps {
  onLogoUploaded?: (logoUrl: string) => void;
  onLogoDeleted?: () => void;
  className?: string;
}

const LogoUpload: React.FC<LogoUploadProps> = ({ 
  onLogoUploaded, 
  onLogoDeleted, 
  className = '' 
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [logoExists, setLogoExists] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Check if logo exists on component mount
  React.useEffect(() => {
    if (user?.id) {
      checkLogoExists(user.id).then(exists => {
        setLogoExists(exists);
        if (exists) {
          setCurrentLogoUrl(getLogoUrl(user.id));
        }
      });
    }
  }, [user?.id]);

  const handleFileSelect = async (file: File) => {
    if (!user) {
      toast.error('You must be logged in to upload a logo');
      return;
    }

    console.log('📁 File selected for upload:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      const result = await uploadLogo({
        file,
        userId: user.id,
        onProgress: (progress) => {
          setUploadProgress(progress);
        }
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.publicUrl) {
        setCurrentLogoUrl(result.publicUrl);
        setLogoExists(true);
        toast.success('Logo uploaded successfully!');
        
        if (onLogoUploaded) {
          onLogoUploaded(result.publicUrl);
        }
      } else {
        toast.error(result.error || 'Failed to upload logo');
      }
    } catch (error) {
      console.error('Error in handleFileSelect:', error);
      toast.error('An unexpected error occurred while uploading the logo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDeleteLogo = async () => {
    if (!user) return;

    setDeleting(true);
    try {
      const result = await deleteLogo(user.id);
      
      if (result.success) {
        setCurrentLogoUrl(null);
        setLogoExists(false);
        toast.success('Logo deleted successfully');
        
        if (onLogoDeleted) {
          onLogoDeleted();
        }
      } else {
        toast.error(result.error || 'Failed to delete logo');
      }
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast.error('An unexpected error occurred while deleting the logo');
    } finally {
      setDeleting(false);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Please log in to upload a logo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Image className="h-5 w-5" />
          <span>Business Logo</span>
        </CardTitle>
        <CardDescription>
          Upload your business logo to display in your feedback widget. Max 5MB, JPG/PNG/GIF/WebP formats.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Logo Display */}
        {currentLogoUrl && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="relative inline-block">
                <img
                  src={currentLogoUrl}
                  alt="Current logo"
                  className="max-w-full max-h-32 object-contain border border-gray-200 rounded-lg p-2 bg-gray-50"
                  onError={(e) => {
                    console.error('Error loading logo image:', e);
                    toast.error('Failed to load logo image');
                  }}
                />
                <div className="absolute -top-2 -right-2">
                  <div className="bg-green-500 text-white p-1 rounded-full">
                    <Check className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center space-x-2">
              <Button
                onClick={openFileDialog}
                disabled={uploading}
                variant="outline"
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace Logo
              </Button>
              
              <Button
                onClick={handleDeleteLogo}
                disabled={deleting}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {deleting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Upload Area */}
        {!currentLogoUrl && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            } ${uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={openFileDialog}
          >
            {uploading ? (
              <div className="space-y-4">
                <RefreshCw className="h-12 w-12 text-blue-500 mx-auto animate-spin" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">Uploading Logo...</p>
                  <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                  <p className="text-sm text-gray-500">{Math.round(uploadProgress)}% complete</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Upload className="h-8 w-8 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">
                    {dragOver ? 'Drop your logo here' : 'Upload your business logo'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Drag and drop an image file, or click to browse
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                    <span>• JPG, PNG, GIF, WebP</span>
                    <span>•</span>
                    <span>Max 5MB</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Upload Instructions */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Your logo will be displayed in your feedback widget and used for branding purposes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LogoUpload;
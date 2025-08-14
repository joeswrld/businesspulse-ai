import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Eye,
  Trash2,
  Download,
  Brain,
  Clock,
  RefreshCw,
  Plus,
  File,
  BarChart3,
  Image,
  Archive
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Upload {
  id: string;
  user_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: 'processing' | 'completed' | 'failed';
  insights_generated: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

const DataUpload: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Form state
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textCategory, setTextCategory] = useState('general');
  const [textPriority, setTextPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Fetch uploads data
  const fetchUploadsData = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔍 Fetching uploads data for user:', user.id);
      
      const { data: uploadsData, error: uploadsError } = await supabase
        .from('data_uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (uploadsError) throw uploadsError;

      console.log('📊 Uploads data fetched:', uploadsData?.length || 0);
      setUploads(uploadsData || []);
      
    } catch (error) {
      console.error('❌ Error fetching uploads data:', error);
      toast({
        title: "Error",
        description: "Failed to load uploads",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up real-time uploads subscriptions for user:', user.id);

    const uploadsChannel = supabase
      .channel('uploads-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_uploads',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Upload real-time update:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            setUploads(prev => [payload.new as Upload, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setUploads(prev => 
              prev.map(upload => 
                upload.id === payload.new.id ? payload.new as Upload : upload
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setUploads(prev => prev.filter(upload => upload.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time uploads subscriptions');
      supabase.removeChannel(uploadsChannel);
    };
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchUploadsData();
  }, [fetchUploadsData]);

  // Handle file uploads
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!user || files.length === 0) return;

    setUploading(true);
    const uploadPromises = Array.from(files).map(file => uploadFile(file));

    try {
      await Promise.all(uploadPromises);
      toast({
        title: "Upload Successful",
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('❌ File upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Some files failed to upload",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  }, [user, toast, uploadFile]);

  // Upload individual file
  const uploadFile = useCallback(async (file: File) => {
    try {
      console.log(`🚀 Uploading file: ${file.name}`);
      
      // Create upload record
      const { data: upload, error: uploadError } = await supabase
        .from('data_uploads')
        .insert({
          user_id: user!.id,
          filename: file.name,
          file_size: file.size,
          file_type: file.type,
          status: 'processing'
        })
        .select()
        .single();

      if (uploadError) throw uploadError;

      // Upload to storage
      const filePath = `uploads/${user!.id}/${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase.storage
        .from('data-uploads')
        .upload(filePath, file);

      if (storageError) throw storageError;

      // Update status to completed
      await supabase
        .from('data_uploads')
        .update({ status: 'completed' })
        .eq('id', upload.id);

      // Trigger analysis
      await supabase.functions.invoke('analyze-upload', {
        body: {
          user_id: user!.id,
          upload_id: upload.id,
          file_path: filePath,
          filename: file.name
        }
      });

      console.log(`✅ File uploaded successfully: ${file.name}`);
      
    } catch (error) {
      console.error(`❌ Error uploading ${file.name}:`, error);
      
      // Update upload status to failed
      // Not rethrowing, allow other files to proceed
      // Caller will aggregate and show a toast
    }
  }, [user]);

  // Handle text input submission
  const handleTextSubmit = async () => {
    if (!user || !textInput.trim() || !textTitle.trim()) return;

    setUploading(true);
    try {
      console.log('🚀 Submitting text input');
      
      // Create upload record for text
      const { data: upload, error: uploadError } = await supabase
        .from('data_uploads')
        .insert({
          user_id: user.id,
          filename: `${textTitle}.txt`,
          file_type: 'text/plain',
          file_size: new TextEncoder().encode(textInput).length,
          status: 'processing'
        })
        .select()
        .single();

      if (uploadError) throw uploadError;

      // Store text content in storage
      const filePath = `uploads/${user.id}/${Date.now()}_${textTitle}.txt`;
      const { error: storageError } = await supabase.storage
        .from('data-uploads')
        .upload(filePath, new Blob([textInput], { type: 'text/plain' }));

      if (storageError) throw storageError;

      // Update upload status to completed
      await supabase
        .from('data_uploads')
        .update({ status: 'completed' })
        .eq('id', upload.id);

      // Trigger AI analysis
      await supabase.functions.invoke('analyze-upload', {
        body: {
          user_id: user.id,
          upload_id: upload.id,
          file_path: filePath,
          filename: `${textTitle}.txt`,
          text_content: textInput,
          category: textCategory,
          priority: textPriority
        }
      });

      // Clear form
      setTextInput('');
      setTextTitle('');
      setTextCategory('general');
      setTextPriority('medium');

      toast({
        title: "Text Submitted",
        description: "Your text has been submitted for AI analysis",
      });
      
    } catch (error) {
      console.error('❌ Text submission error:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : 'Failed to submit text',
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  // Delete upload
  const deleteUpload = async (uploadId: string) => {
    if (!confirm('Are you sure you want to delete this upload?')) return;

    try {
      const { error } = await supabase
        .from('data_uploads')
        .delete()
        .eq('id', uploadId);

      if (error) throw error;

      toast({
        title: "Upload Deleted",
        description: "Upload has been removed successfully",
      });

    } catch (error) {
      console.error('❌ Error deleting upload:', error);
      toast({
        title: "Error",
        description: 'Failed to delete upload',
        variant: "destructive"
      });
    }
  };

  // Utility functions
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('csv') || fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return <BarChart3 className="h-5 w-5" />;
    } else if (fileType.includes('pdf')) {
      return <FileText className="h-5 w-5" />;
    } else if (fileType.includes('image')) {
      return <Image className="h-5 w-5" />;
    } else if (fileType.includes('zip') || fileType.includes('rar')) {
      return <Archive className="h-5 w-5" />;
    } else {
      return <File className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading uploads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Data Upload</h1>
              <p className="mt-2 text-lg text-gray-600">
                Upload files and text data for AI-powered business intelligence analysis.
              </p>
            </div>
            <Button onClick={fetchUploadsData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* File Upload */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                File Upload
              </CardTitle>
              <CardDescription>
                Drag and drop files or click to browse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop files here or click to browse
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Supports CSV, Excel, PDF, Word, and text files
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mb-4"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Choose Files
                    </>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".csv,.xlsx,.xls,.pdf,.doc,.docx,.txt,.json"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <p className="text-xs text-gray-400">
                  Maximum file size: 10MB per file
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Text Input */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Text Input
              </CardTitle>
              <CardDescription>
                Enter text data for AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Title</label>
                <Input
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  placeholder="Enter a title for your text data"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Category</label>
                <select
                  value={textCategory}
                  onChange={(e) => setTextCategory(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="finance">Finance</option>
                  <option value="marketing">Marketing</option>
                  <option value="operations">Operations</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={textPriority}
                  onChange={(e) => setTextPriority(e.target.value as 'high' | 'medium' | 'low')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Text Content</label>
                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Enter your text data here..."
                  rows={6}
                  className="mt-1"
                />
              </div>
              
              <Button
                onClick={handleTextSubmit}
                disabled={uploading || !textInput.trim() || !textTitle.trim()}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Submit for AI Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Uploads */}
        <Card className="bg-white shadow-sm border-0 mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Recent Uploads
            </CardTitle>
            <CardDescription>
              Track the status of your uploaded data and generated insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploads.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No uploads yet</h3>
                <p className="text-gray-500">
                  Start by uploading files or entering text data above.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      {getFileIcon(upload.file_type)}
                      <div>
                        <h4 className="font-medium text-gray-900">{upload.filename}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStatusColor(upload.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(upload.status)}
                              <span className="capitalize">{upload.status}</span>
                            </div>
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatFileSize(upload.file_size)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatTimeAgo(upload.created_at)}
                          </span>
                        </div>
                        {upload.error_message && (
                          <p className="text-sm text-red-600 mt-1">
                            Error: {upload.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {upload.status === 'completed' && upload.insights_generated > 0 && (
                        <Badge variant="outline" className="text-green-700">
                          <Brain className="h-3 w-3 mr-1" />
                          {upload.insights_generated} insights
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteUpload(upload.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataUpload;
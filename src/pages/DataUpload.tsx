import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Eye,
  Download,
  Trash2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface UploadRecord {
  id: string;
  user_id: string;
  kind: 'file' | 'text';
  filename?: string;
  mime_type?: string;
  size_bytes?: number;
  storage_path?: string;
  text_content?: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error_message?: string;
  created_at: string;
  processed_at?: string;
}

interface Insight {
  id: string;
  upload_id: string;
  user_id: string;
  summary: string;
  details: {
    bullets: string[];
    recommendations: string[];
    business_impact: string;
  };
  created_at: string;
}

const DataUpload: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [textData, setTextData] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch uploads and insights
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch uploads
      const { data: uploadsData, error: uploadsError } = await supabase
        .from('uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (uploadsError) throw uploadsError;

      // Fetch insights
      const { data: insightsData, error: insightsError } = await supabase
        .from('insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (insightsError) throw insightsError;

      setUploads(uploadsData || []);
      setInsights(insightsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load uploads and insights",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to uploads changes
    const uploadsChannel = supabase
      .channel('uploads-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'uploads',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setUploads(prev => [payload.new as UploadRecord, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setUploads(prev => 
              prev.map(upload => 
                upload.id === payload.new.id ? payload.new as UploadRecord : upload
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setUploads(prev => prev.filter(upload => upload.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to insights changes
    const insightsChannel = supabase
      .channel('insights-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'insights',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setInsights(prev => [payload.new as Insight, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setInsights(prev => 
              prev.map(insight => 
                insight.id === payload.new.id ? payload.new as Insight : insight
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setInsights(prev => prev.filter(insight => insight.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(uploadsChannel);
      supabase.removeChannel(insightsChannel);
    };
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // File upload handling
  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'text/plain',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload CSV, XLSX, DOCX, TXT, or PDF files only",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      const uid = crypto.randomUUID();
      const path = `${user.id}/${uid}/${selectedFile.name}`;

      // Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('uploads')
        .upload(path, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (storageError) throw storageError;

      // Create database record
      const { data: uploadRecord, error: dbError } = await supabase
        .from('uploads')
        .insert({
          user_id: user.id,
          kind: 'file',
          filename: selectedFile.name,
          mime_type: selectedFile.type,
          size_bytes: selectedFile.size,
          storage_path: path,
          status: 'pending'
        })
        .select('*')
        .single();

      if (dbError) throw dbError;

      // Trigger AI analysis
      const { error: analysisError } = await supabase.functions.invoke('analyze-upload', {
        body: { upload_id: uploadRecord.id }
      });

      if (analysisError) throw analysisError;

      toast({
        title: "File uploaded successfully",
        description: "AI analysis has been started",
      });

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const uploadText = async () => {
    if (!textData.trim() || !user) return;

    setUploading(true);
    try {
      // Create database record
      const { data: uploadRecord, error: dbError } = await supabase
        .from('uploads')
        .insert({
          user_id: user.id,
          kind: 'text',
          text_content: textData.trim(),
          status: 'pending'
        })
        .select('*')
        .single();

      if (dbError) throw dbError;

      // Trigger AI analysis
      const { error: analysisError } = await supabase.functions.invoke('analyze-upload', {
        body: { upload_id: uploadRecord.id }
      });

      if (analysisError) throw analysisError;

      toast({
        title: "Text uploaded successfully",
        description: "AI analysis has been started",
      });

      setTextData('');
    } catch (error: any) {
      console.error('Text upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteUpload = async (uploadId: string) => {
    try {
      const { error } = await supabase
        .from('uploads')
        .delete()
        .eq('id', uploadId);

      if (error) throw error;

      toast({
        title: "Upload deleted",
        description: "The upload has been removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "An error occurred while deleting",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading upload system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Data Upload</h1>
          <p className="mt-2 text-lg text-gray-600">
            Upload files or enter data to generate AI insights
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Upload Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* File Upload */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center">
                <File className="h-5 w-5 mr-2 text-blue-600" />
                File Upload
              </CardTitle>
              <CardDescription>
                Drop files here or click to browse
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  accept=".csv,.xlsx,.docx,.txt,.pdf"
                />
                
                {selectedFile ? (
                  <div className="space-y-2">
                    <File className="h-12 w-12 text-blue-600 mx-auto" />
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-gray-600">
                      <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      CSV, XLSX, DOCX, TXT, PDF up to 10MB
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={uploadFile}
                disabled={!selectedFile || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Analyze
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Text Input */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-green-600" />
                Text Data Input
              </CardTitle>
              <CardDescription>
                Enter your data or feedback here...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={textData}
                onChange={(e) => setTextData(e.target.value)}
                rows={8}
                placeholder="Paste structured data, notes, or feedback..."
                className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <Button
                onClick={uploadText}
                disabled={!textData.trim() || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Upload & Analyze
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Uploads */}
        <Card className="bg-white shadow-sm border-0">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Recent Uploads</h2>
                <p className="text-sm text-gray-600">
                  Live updates as your files/text are processed
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uploads.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No uploads yet</h3>
                <p className="text-gray-500">Start by uploading a file or entering text data above</p>
              </div>
            ) : (
              <div className="space-y-4">
                {uploads.map((upload) => {
                  const insight = insights.find(i => i.upload_id === upload.id);
                  
                  return (
                    <div key={upload.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            {upload.kind === 'file' ? (
                              <File className="h-5 w-5 text-blue-600" />
                            ) : (
                              <FileText className="h-5 w-5 text-green-600" />
                            )}
                            <h4 className="font-medium text-gray-900 truncate">
                              {upload.kind === 'file' ? (upload.filename || 'File') : 'Text submission'}
                            </h4>
                          </div>
                          
                          <div className="text-sm text-gray-500 space-y-1">
                            <p>{new Date(upload.created_at).toLocaleString()}</p>
                            {upload.kind === 'file' && upload.size_bytes && (
                              <p>{formatFileSize(upload.size_bytes)}</p>
                            )}
                            {upload.kind === 'text' && upload.text_content && (
                              <p className="truncate max-w-md">
                                {upload.text_content.length > 100 
                                  ? `${upload.text_content.substring(0, 100)}...` 
                                  : upload.text_content
                                }
                              </p>
                            )}
                          </div>

                          {insight && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                              <h5 className="font-medium text-blue-900 mb-2">AI Insights</h5>
                              <p className="text-sm text-blue-800 mb-2">{insight.summary}</p>
                              {insight.details.bullets.length > 0 && (
                                <ul className="text-sm text-blue-700 space-y-1">
                                  {insight.details.bullets.slice(0, 3).map((bullet, index) => (
                                    <li key={index} className="flex items-start">
                                      <span className="text-blue-500 mr-2">•</span>
                                      {bullet}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <Badge className={getStatusColor(upload.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(upload.status)}
                              <span className="capitalize">{upload.status}</span>
                            </div>
                          </Badge>
                          
                          {upload.status === 'done' && insight && (
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-2" />
                              View Insights
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteUpload(upload.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {upload.error_message && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-700">
                            <AlertCircle className="h-4 w-4 inline mr-2" />
                            Error: {upload.error_message}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataUpload;
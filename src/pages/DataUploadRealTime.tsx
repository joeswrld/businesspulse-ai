import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  File,
  X,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  FileImage
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function DataUploadRealTime() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [file, setFile] = useState<File | null>(null);
  const [textData, setTextData] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Supported file types
  const allowedFileTypes = ["pdf", "docx", "csv", "txt"];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  // Get file type icon
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'pdf':
        return <FileImage className="h-4 w-4" />;
      case 'docx':
        return <FileText className="h-4 w-4" />;
      case 'txt':
        return <FileText className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  // Get file type badge color
  const getFileTypeBadge = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'csv':
        return <Badge variant="default" className="bg-green-100 text-green-800">CSV</Badge>;
      case 'pdf':
        return <Badge variant="default" className="bg-red-100 text-red-800">PDF</Badge>;
      case 'docx':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">DOCX</Badge>;
      case 'txt':
        return <Badge variant="default" className="bg-gray-100 text-gray-800">TXT</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  }, []);

  const validateAndSetFile = (selectedFile: File) => {
    setError("");

    // Check file size
    if (selectedFile.size > maxFileSize) {
      setError(`File size too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB.`);
      return;
    }

    // Check file type
    const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !allowedFileTypes.includes(fileExt)) {
      setError(`Unsupported file type. Supported: ${allowedFileTypes.join(', ').toUpperCase()}`);
      return;
    }

    setFile(selectedFile);
    setTextData(""); // Clear text input when file is selected
  };

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
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }, []);

  const removeFile = () => {
    setFile(null);
    setError("");
  };

  const clearText = () => {
    setTextData("");
    setError("");
  };

  const handleUpload = async () => {
    // Validation
    if (!file && !textData.trim()) {
      setError("Please upload a file or enter text data.");
      return;
    }

    setLoading(true);
    setError("");
    setUploadProgress(0);

    try {
      let sourceType = "";
      let fileUrl = "";
      let fileName = "";

      if (file) {
        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        sourceType = fileExt || 'txt';
        fileName = `${user?.id}/${Date.now()}_${file.name}`;
        
        setUploadProgress(25);
        
        const { data, error: storageError } = await supabase.storage
          .from("data-files")
          .upload(fileName, file);

        if (storageError) {
          console.error('Storage error:', storageError);
          throw new Error(`Failed to upload file: ${storageError.message}`);
        }
        
        fileUrl = data?.path || "";
        setUploadProgress(50);
      } else {
        // Text input
        sourceType = "text";
        setUploadProgress(50);
      }

      // Insert into data_sources with correct type mapping
      const { data: sourceRow, error: insertError } = await supabase
        .from("data_sources")
        .insert({
          name: file ? file.name : "Text Data",
          type: sourceType, // This will be the file extension or "text"
          user_id: user?.id,
          file_url: fileUrl || null,
          metadata: textData ? { content: textData } : {},
          status: "processing"
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Failed to create data source: ${insertError.message}`);
      }

      setUploadProgress(75);

      // Trigger AI Insight Generation via Edge Function
      const { data: aiResult, error: aiError } = await supabase.functions.invoke("generate_insights", {
        body: { data_source_id: sourceRow.id }
      });

      if (aiError) {
        console.error('AI processing error:', aiError);
        // Don't throw here, just log the error and show a warning
        toast({
          title: "Upload successful",
          description: "File uploaded but AI processing failed. Insights may be limited.",
          variant: "default"
        });
      } else {
        toast({
          title: "Upload successful!",
          description: `Generated ${aiResult?.data?.insights_generated || 0} insights from your data.`,
        });
      }

      setUploadProgress(100);

      // Clear form
      setFile(null);
      setTextData("");
      
      // Show success popup
      toast({
        title: "Upload successful!",
        description: "Insights will appear on the AI Insights page shortly.",
      });

      // Redirect to insights page after a short delay
      setTimeout(() => {
        navigate('/ai-insights');
      }, 2000);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || "Upload failed");
      toast({
        title: "Upload failed",
        description: err.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Upload</h1>
          <p className="text-lg text-gray-600">
            Supported file types: <strong>PDF, DOCX, CSV, TXT</strong> or paste text directly.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Upload Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload Card */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Upload className="h-5 w-5 mr-2 text-blue-600" />
                  Upload File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">
                    {dragActive ? 'Drop your file here' : 'Drag and drop your file here'}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    or click to browse files
                  </p>
                  <Input
                    type="file"
                    accept=".csv,.pdf,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button variant="outline" asChild>
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <Plus className="h-4 w-4 mr-2" />
                      Select File
                    </Label>
                  </Button>
                </div>

                {/* Selected File Display */}
                {file && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Selected File</Label>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file.name)}
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        {getFileTypeBadge(file.name)}
                      </div>
                      <Button variant="ghost" size="sm" onClick={removeFile}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {loading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-sm text-center text-gray-600">
                      {uploadProgress < 50 ? "Uploading file..." : 
                       uploadProgress < 75 ? "Processing data..." : 
                       "Generating AI insights..."} {uploadProgress}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Text Input Card */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Or Enter Text Directly
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Paste your text data here... (e.g., customer feedback, survey responses, notes, etc.)"
                    value={textData}
                    onChange={(e) => setTextData(e.target.value)}
                    className="min-h-32 resize-none"
                    disabled={loading}
                  />
                  {textData && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {textData.length} characters
                      </span>
                      <Button variant="ghost" size="sm" onClick={clearText}>
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <Button 
              onClick={handleUpload} 
              disabled={loading || (!file && !textData.trim())} 
              className="w-full h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {uploadProgress < 50 ? "Uploading..." : 
                   uploadProgress < 75 ? "Processing..." : 
                   "Generating Insights..."}
                </>
              ) : (
                "Upload & Generate Insights"
              )}
            </Button>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Supported File Types */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Supported File Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileSpreadsheet className="h-5 w-5 text-green-600" />
                      <span className="font-medium">CSV</span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700">Supported</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileImage className="h-5 w-5 text-red-600" />
                      <span className="font-medium">PDF</span>
                    </div>
                    <Badge variant="outline" className="bg-red-50 text-red-700">Supported</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">DOCX</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">Supported</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">TXT</span>
                    </div>
                    <Badge variant="outline" className="bg-gray-50 text-gray-700">Supported</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload Guidelines */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Upload Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Maximum file size: 10MB</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>AI insights generated automatically</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Real-time updates on AI Insights page</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Secure file storage in Supabase</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/ai-insights')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View AI Insights
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/dashboard')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
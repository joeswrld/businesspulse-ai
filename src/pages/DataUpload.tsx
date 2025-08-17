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
  Database,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Plus,
  Loader2
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeDataSources } from "@/hooks/useRealtime";
import { useNavigate } from "react-router-dom";

const DataUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: dataSources, loading } = useRealtimeDataSources();
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 && !textInput.trim()) {
      toast({
        title: "No data selected",
        description: "Please select files or enter text data to upload.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setIsGenerating(false);
    setUploadProgress(0);

    try {
      // Handle text input
      if (textInput.trim()) {
        const { data: textDataSource, error: textError } = await supabase.from('data_sources').insert({
          user_id: user?.id,
          name: 'Text Input',
          type: 'text',
          status: 'processing',
          metadata: { content: textInput }
        }).select().single();

        if (textError) throw textError;
        
        // Trigger AI processing for text input
        await processDataSource(textDataSource.id, 'text/plain', undefined, textInput);
        setUploadProgress(50);
      }

      // Handle file uploads
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Upload file to Supabase Storage
        const fileName = `${user?.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('data-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get file URL
        const { data: urlData } = supabase.storage
          .from('data-files')
          .getPublicUrl(fileName);

        // Determine file type based on extension
        let fileType = 'text'; // Default
        if (file.type.includes('pdf')) fileType = 'pdf';
        else if (file.type.includes('csv')) fileType = 'csv';
        else if (file.type.includes('excel') || file.type.includes('spreadsheet')) fileType = 'xlsx';
        else if (file.type.includes('word')) fileType = 'docx';
        else if (file.type.includes('json')) fileType = 'json';
        else if (file.type.includes('text')) fileType = 'txt';

        // Create data source record with valid ENUM type
        const { data: fileDataSource, error: fileError } = await supabase.from('data_sources').insert({
          user_id: user?.id,
          name: file.name,
          type: fileType,
          file_size: file.size,
          file_url: urlData.publicUrl,
          status: 'processing'
        }).select().single();

        if (fileError) {
          // If the type is invalid, show error
          if (fileError.message.includes('type_check')) {
            toast({
              title: "Invalid data type",
              description: "Please select a valid category.",
              variant: "destructive"
            });
            throw new Error("Invalid data type. Please select a valid category.");
          }
          throw fileError;
        }

        // Trigger AI processing for file
        await processDataSource(fileDataSource.id, file.type, urlData.publicUrl);
        
        setUploadProgress(50 + ((i + 1) / selectedFiles.length) * 50);
      }

      // Start AI generation
      setIsGenerating(true);
      toast({
        title: "Upload successful",
        description: "Generating insights from your data..."
      });

      setSelectedFiles([]);
      setTextInput("");
      setUploadProgress(100);

      // Redirect to insights page after a short delay
      setTimeout(() => {
        navigate('/ai-insights');
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
      setIsUploading(false);
      setIsGenerating(false);
      setUploadProgress(0);
    }
  };

  const processDataSource = async (dataSourceId: string, fileType: string, fileUrl?: string, textContent?: string) => {
    try {
      // Extract content from file or use text content
      let content = textContent || '';
      
      if (fileUrl && !textContent) {
        // Download file content
        const response = await fetch(fileUrl);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const decoder = new TextDecoder();
          content = decoder.decode(buffer);
        }
      }

      if (!content.trim()) {
        throw new Error('No content extracted from file');
      }

      // Call the generate-insights Edge Function
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: {
          data_source_id: dataSourceId,
          user_id: user?.id,
          content: content
        }
      });

      if (error) {
        console.error('Error calling generate-insights:', error);
        throw error;
      }

      console.log('Insights generated:', data);

      // Update data source status to completed
      await supabase
        .from('data_sources')
        .update({ 
          status: 'completed',
          metadata: {
            processed_at: new Date().toISOString(),
            insights_generated: data?.data?.insights_generated || 0
          }
        })
        .eq('id', dataSourceId);

    } catch (error) {
      console.error('Processing error:', error);
      // Update data source status to failed
      await supabase
        .from('data_sources')
        .update({ status: 'failed' })
        .eq('id', dataSourceId);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Data Upload</h1>
        <p className="text-muted-foreground">Upload files or enter data to generate AI insights</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                File Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const files = Array.from(e.dataTransfer.files);
                  setSelectedFiles(prev => [...prev, ...files]);
                }}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  {dragActive ? 'Drop files here' : 'Drop files here or click to browse'}
                </p>
                <Input
                  type="file"
                  multiple
                  accept=".csv,.xlsx,.pdf,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button variant="outline" asChild>
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <Plus className="h-4 w-4 mr-2" />
                    Select Files
                  </Label>
                </Button>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Files ({selectedFiles.length})</Label>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div className="flex items-center space-x-2">
                          <File className="h-4 w-4" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-center">Uploading... {uploadProgress}%</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Text Data Input</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter your data or feedback here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="min-h-32"
              />
            </CardContent>
          </Card>

          <Button onClick={handleUpload} disabled={isUploading || isGenerating} className="w-full" size="lg">
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating insights...
              </>
            ) : (
              "Upload & Analyze"
            )}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Uploads
              <Badge variant="outline">{dataSources.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse h-16 bg-muted rounded"></div>
                ))}
              </div>
            ) : dataSources.length > 0 ? (
              <div className="space-y-3">
                {dataSources.slice(0, 5).map((source) => (
                  <div key={source.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{source.name}</span>
                      <Badge variant={source.status === 'completed' ? 'default' : 'secondary'}>
                        {source.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(source.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No uploads yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataUpload;
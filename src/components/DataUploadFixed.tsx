import { useState } from "react";
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
import { useNavigate } from "react-router-dom";

export default function DataUploadFixed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [file, setFile] = useState<File | null>(null);
  const [textData, setTextData] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  // Allowed types based on the database constraint
  const allowedTypes = ["file", "api", "text"];

  async function handleUpload() {
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
        sourceType = "file";
        const fileExt = file.name.split(".").pop();
        fileName = `${user?.id}/${Date.now()}_${file.name}`;
        
        setUploadProgress(25);
        
        const { data, error: storageError } = await supabase.storage
          .from("data-files")
          .upload(fileName, file);

        if (storageError) throw storageError;
        fileUrl = data?.path || "";
        
        setUploadProgress(50);
      } else {
        // Text input
        sourceType = "text";
        setUploadProgress(50);
      }

      if (!allowedTypes.includes(sourceType)) {
        throw new Error(`Invalid source type: ${sourceType}`);
      }

      // Insert into data_sources with correct type
      const { data: sourceRow, error: insertError } = await supabase
        .from("data_sources")
        .insert({
          name: file ? file.name : "Text Data",
          type: sourceType,
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
        // Don't throw here, just log the error
        toast({
          title: "Upload successful",
          description: "File uploaded but AI processing failed. Insights may be limited.",
          variant: "default"
        });
      } else {
        toast({
          title: "Upload successful",
          description: `Generated ${aiResult?.data?.insights_generated || 0} insights from your data.`
        });
      }

      setUploadProgress(100);

      // Clear form
      setFile(null);
      setTextData("");
      
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
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(""); // Clear any previous errors
    }
  };

  const removeFile = () => {
    setFile(null);
    setError("");
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
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  Drop files here or click to browse
                </p>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.pdf,.docx,.txt,.json"
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

              {file && (
                <div className="space-y-2">
                  <Label>Selected File</Label>
                  <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2">
                      <File className="h-4 w-4" />
                      <span className="text-sm">{file.name}</span>
                      <Badge variant="outline">
                        {file.type.includes('text') ? 'text' : 
                         file.type.includes('json') ? 'api' : 'file'}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removeFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {loading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-center">
                    {uploadProgress < 50 ? "Uploading..." : 
                     uploadProgress < 75 ? "Processing..." : 
                     "Generating insights..."} {uploadProgress}%
                  </p>
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
                value={textData}
                onChange={(e) => setTextData(e.target.value)}
                className="min-h-32"
              />
            </CardContent>
          </Card>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={loading || (!file && !textData.trim())} 
            className="w-full" 
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadProgress < 50 ? "Uploading..." : 
                 uploadProgress < 75 ? "Processing..." : 
                 "Generating insights..."}
              </>
            ) : (
              "Upload & Generate Insights"
            )}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Allowed File Types
              <Badge variant="outline">3</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">File Uploads</span>
                  <Badge variant="default">file</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  PDFs, CSVs, Excel files, etc.
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">API Data</span>
                  <Badge variant="secondary">api</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  JSON files, API responses
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Text Input</span>
                  <Badge variant="outline">text</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Direct text entry
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
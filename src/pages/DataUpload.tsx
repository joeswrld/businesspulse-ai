import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Upload as UploadIcon, 
  FileText, 
  Database, 
  Link as LinkIcon,
  X,
  Check,
  AlertCircle,
  Brain,
  Download
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DataUpload = () => {
  const [activeTab, setActiveTab] = useState("files");
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    status: "processing" | "completed" | "error";
    uploadedAt: Date;
  }>>([]);
  const [textInput, setTextInput] = useState("");
  const [connections, setConnections] = useState([]);
  const { toast } = useToast();

  const handleFileUpload = useCallback((files: FileList) => {
    Array.from(files).forEach(file => {
      const newFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        status: "processing" as const,
        uploadedAt: new Date()
      };
      
      setUploadedFiles(prev => [...prev, newFile]);
      
      // Simulate processing
      setTimeout(() => {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === newFile.id 
              ? { ...f, status: "completed" } 
              : f
          )
        );
        toast({
          title: "File processed",
          description: `${file.name} has been successfully analyzed.`,
        });
      }, 2000 + Math.random() * 3000);
    });
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const tabs = [
    { id: "files", name: "Upload Files", icon: UploadIcon },
    { id: "text", name: "Text Input", icon: FileText },
    { id: "connections", name: "Connections", icon: Database },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Data Upload</h1>
          <p className="text-muted-foreground">
            Upload documents, connect data sources, or input text for AI analysis.
          </p>
        </div>
        <Button variant="hero">
          <Brain className="h-4 w-4 mr-2" />
          Process All Data
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="font-medium">{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === "files" && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Drag and drop files or click to browse. Supports PDF, CSV, Excel, Word, and text files.
                </p>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <UploadIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Drop files here or click to upload</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Maximum file size: 50MB per file
                  </p>
                  <Button variant="outline">
                    Browse Files
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.csv,.xlsx,.xls,.doc,.docx,.txt"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  />
                </div>

                {/* Uploaded Files */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="font-medium">Uploaded Files</h4>
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)} • {file.uploadedAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={
                              file.status === "completed" ? "default" : 
                              file.status === "error" ? "destructive" : "secondary"
                            }
                          >
                            {file.status === "processing" && <AlertCircle className="h-3 w-3 mr-1" />}
                            {file.status === "completed" && <Check className="h-3 w-3 mr-1" />}
                            {file.status === "error" && <X className="h-3 w-3 mr-1" />}
                            {file.status}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "text" && (
            <Card>
              <CardHeader>
                <CardTitle>Text Input</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Paste or type business data, feedback, reports, or any text for AI analysis.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="text-input">Your Data</Label>
                  <Textarea
                    id="text-input"
                    placeholder="Paste your business data, customer feedback, reports, or any text here..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="min-h-[300px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {textInput.length} characters
                  </p>
                </div>
                <Button 
                  variant="hero" 
                  className="w-full"
                  disabled={!textInput.trim()}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze Text
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "connections" && (
            <Card>
              <CardHeader>
                <CardTitle>Data Source Connections</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Connect to external data sources for automated insights.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { name: "Google Sheets", icon: "📊", status: "available" },
                    { name: "Salesforce", icon: "☁️", status: "available" },
                    { name: "Stripe", icon: "💳", status: "available" },
                    { name: "HubSpot", icon: "🔗", status: "coming-soon" },
                    { name: "Mailchimp", icon: "📧", status: "coming-soon" },
                    { name: "Slack", icon: "💬", status: "coming-soon" },
                  ].map((source) => (
                    <div key={source.name} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{source.icon}</span>
                          <div>
                            <h4 className="font-medium">{source.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {source.status === "available" ? "Ready to connect" : "Coming soon"}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant={source.status === "available" ? "outline" : "ghost"}
                          disabled={source.status !== "available"}
                        >
                          {source.status === "available" ? "Connect" : "Soon"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Processing Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Processing Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Files in Queue</span>
                <Badge variant="outline">
                  {uploadedFiles.filter(f => f.status === "processing").length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Completed</span>
                <Badge variant="default">
                  {uploadedFiles.filter(f => f.status === "completed").length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Insights</span>
                <Badge variant="secondary">
                  {uploadedFiles.filter(f => f.status === "completed").length * 3}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Sample CSV Template
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Data Format Guide
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Brain className="h-4 w-4 mr-2" />
                View All Insights
              </Button>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tips for Better Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <h4 className="font-medium mb-1">File Quality</h4>
                <p className="text-muted-foreground">Use clear, structured data with headers and consistent formatting.</p>
              </div>
              <div className="text-sm">
                <h4 className="font-medium mb-1">Data Volume</h4>
                <p className="text-muted-foreground">More data typically leads to better insights and trend analysis.</p>
              </div>
              <div className="text-sm">
                <h4 className="font-medium mb-1">Regular Updates</h4>
                <p className="text-muted-foreground">Upload data regularly to track changes and identify patterns.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DataUpload;
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { 
  Brain, 
  TrendingUp, 
  AlertCircle, 
  Download, 
  Filter,
  Search,
  Star,
  Clock,
  Target,
  BarChart3,
  FileText,
  Share,
  Bookmark,
  Plus,
  Loader2,
  CheckCircle,
  Upload,
  X,
  FileUp,
  MessageSquare
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAIInsights } from "@/hooks/useAIInsights";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const AIInsights = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("high");
  const [filteredInsights, setFilteredInsights] = useState<any[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const { toast } = useToast();
  const { insights, loading, stats, filterInsights, bookmarkInsight } = useAIInsights();
  const { user } = useAuth();

  // Filter insights based on search and filters
  useEffect(() => {
    const filtered = filterInsights(searchTerm, filterCategory, filterPriority);
    setFilteredInsights(filtered);
  }, [insights, searchTerm, filterPriority, filterCategory, filterInsights]);

  // Handle file drag and drop
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
      const file = e.dataTransfer.files[0];
      if (isValidFileType(file)) {
        setUploadFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload CSV, PDF, DOCX, or TXT files only.",
          variant: "destructive",
        });
      }
    }
  };

  const isValidFileType = (file: File) => {
    const validTypes = [
      'text/csv',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    return validTypes.includes(file.type) || file.name.match(/\.(csv|pdf|docx|txt)$/i);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isValidFileType(file)) {
        setUploadFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload CSV, PDF, DOCX, or TXT files only.",
          variant: "destructive",
        });
      }
    }
  };

  // Ensure uploads bucket exists
  const ensureUploadsBucket = async () => {
    try {
      // Try to list buckets to check if uploads exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        return false;
      }

      const uploadsBucket = buckets?.find(bucket => bucket.name === 'uploads');
      
      if (!uploadsBucket) {
        toast({
          title: "Setting up storage",
          description: "Creating uploads bucket...",
        });
        
        // Try to create the bucket (this requires service role, so it might fail on client)
        const { error: createError } = await supabase.storage.createBucket('uploads', {
          public: false,
          allowedMimeTypes: ['text/csv', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
          fileSizeLimit: 10485760 // 10MB
        });

        if (createError) {
          console.error('Error creating bucket:', createError);
          toast({
            title: "Storage setup required",
            description: "Please create an 'uploads' bucket in your Supabase dashboard under Storage > Buckets.",
            variant: "destructive",
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error ensuring bucket:', error);
      return false;
    }
  };

  const handleUpload = async () => {
    if (!uploadFile && !textInput.trim()) {
      toast({
        title: "No content provided",
        description: "Please upload a file or enter text to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload data.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      let fileUrl = null;
      let fileName = "Text Input";

      // Upload file to Supabase Storage if provided
      if (uploadFile) {
        fileName = uploadFile.name;
        
        // Ensure bucket exists before upload
        const bucketExists = await ensureUploadsBucket();
        if (!bucketExists) {
          throw new Error("Storage bucket not available. Please contact support.");
        }

        const fileNameWithTimestamp = `${Date.now()}-${uploadFile.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(`user-${user.id}/${fileNameWithTimestamp}`, uploadFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          
          // Provide specific error messages
          if (uploadError.message.includes('bucket')) {
            throw new Error("Storage bucket not found. Please create an 'uploads' bucket in your Supabase dashboard.");
          } else if (uploadError.message.includes('size')) {
            throw new Error("File too large. Maximum size is 10MB.");
          } else if (uploadError.message.includes('type')) {
            throw new Error("File type not supported. Please upload CSV, PDF, DOCX, or TXT files.");
          } else {
            throw uploadError;
          }
        }

        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(uploadData.path);

        fileUrl = publicUrl;
      }

      // Create data source record
      const { data: dataSource, error: insertError } = await supabase
        .from('data_sources')
        .insert({
          user_id: user.id,
          name: fileName,
          type: uploadFile ? 'file' : 'text',
          status: 'processing',
          metadata: {
            file_url: fileUrl,
            text_content: textInput || null,
            uploaded_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Processing started",
        description: "Your data is being analyzed. Insights will appear shortly.",
      });

      // Trigger Edge Function to process upload and generate insights
      const { error: functionError } = await supabase.functions.invoke('process-upload-to-insights', {
        body: {
          upload_id: dataSource.id,
          user_id: user.id,
          file_url: fileUrl,
          file_name: fileName,
          text_input: textInput || null
        }
      });

      if (functionError) {
        console.error('Edge function error:', functionError);
        toast({
          title: "Processing started",
          description: "Your data is being processed in the background. Insights will appear shortly.",
        });
      }

      // Reset form and close modal
      setUploadFile(null);
      setTextInput("");
      setShowUploadModal(false);

    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-500 bg-green-50 border-green-200';
      default:
        return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const categories = ["all", "Customer Experience", "Revenue", "Operations", "Growth", "business_opportunity", "risk_alert", "trend_analysis", "operational_insight"];
  const priorities = ["all", "high", "medium", "low"];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">AI Insights</h1>
          <p className="text-muted-foreground">Discover actionable insights from your data</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Data
          </Button>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Upload Data & Generate Insights</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* File Upload Section */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload File (CSV, PDF, DOCX, TXT)
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <FileUp className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-2">
                      Drag and drop your file here, or click to browse
                    </p>
                    <input
                      type="file"
                      accept=".csv,.pdf,.docx,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Choose File
                    </label>
                    {uploadFile && (
                      <p className="mt-2 text-sm text-green-600">
                        ✓ {uploadFile.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Text Input Section */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Or Paste Text Directly
                  </label>
                  <Textarea
                    placeholder="Paste your text content here for analysis..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="min-h-[120px]"
                    disabled={uploading}
                  />
                </div>

                {/* Upload Button */}
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadModal(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || (!uploadFile && !textInput.trim())}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Upload & Analyze
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search insights..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === "all" ? "All Categories" : category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
          >
            {priorities.map(priority => (
              <option key={priority} value={priority}>
                {priority === "all" ? "All Priorities" : `${priority.charAt(0).toUpperCase()}${priority.slice(1)} Priority`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Insights</p>
                <p className="text-2xl font-bold">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalInsights}
                </p>
              </div>
              <Brain className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.highPriorityCount}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${(stats.avgConfidence * 100).toFixed(0)}%`}
                </p>
              </div>
              <Target className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bookmarked</p>
                <p className="text-2xl font-bold">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.bookmarkedCount}
                </p>
              </div>
              <Bookmark className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Tabs */}
      <div className="flex space-x-4 mb-6">
        {["high", "medium", "low"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Priority
          </button>
        ))}
      </div>

      {/* Insights List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading insights...</span>
        </div>
      ) : filteredInsights.filter(i => i.priority === activeTab.charAt(0).toUpperCase() + activeTab.slice(1)).length === 0 ? (
        <div className="text-center py-12">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No {activeTab} priority insights yet.</p>
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="mt-4"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Data to Get Started
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInsights
            .filter(i => i.priority?.toLowerCase() === activeTab)
            .map((insight) => (
              <Card key={insight.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-lg font-semibold">{insight.title}</h2>
                    <div className={`p-2 rounded-full ${getPriorityColor(insight.priority)}`}>
                      {getPriorityIcon(insight.priority)}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-3">
                    Confidence: {((insight.confidence || 0) * 100).toFixed(0)}% | {insight.summary}
                  </p>

                  {insight.key_findings && insight.key_findings.length > 0 && (
                    <div className="mb-3">
                      <h3 className="font-medium text-sm mb-2">Key Findings</h3>
                      <ul className="list-disc ml-5 text-sm space-y-1">
                        {insight.key_findings.map((finding: string, i: number) => (
                          <li key={i} className="text-gray-600">{finding}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insight.recommendations && insight.recommendations.length > 0 && (
                    <div className="mb-3">
                      <h3 className="text-sm mb-2">Recommendations</h3>
                      <ul className="list-disc ml-5 text-sm space-y-1">
                        {insight.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="text-gray-600">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insight.projected_impact && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm italic text-gray-600">
                        {insight.projected_impact}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <span className="text-xs text-gray-500">
                      {new Date(insight.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => bookmarkInsight(insight.id, !insight.tags?.includes('bookmarked'))}
                        className="p-1 h-auto"
                      >
                        <Bookmark 
                          className={`h-4 w-4 ${
                            insight.tags?.includes('bookmarked') 
                              ? 'text-yellow-500 fill-current' 
                              : 'text-gray-400'
                          }`} 
                        />
                      </Button>
                      <Badge variant="outline" className="text-xs">
                        {insight.category}
                      </Badge>
                      {insight.source && (
                        <Badge variant="secondary" className="text-xs">
                          {insight.source}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {!loading && filteredInsights.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No insights found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterPriority !== "all" || filterCategory !== "all"
                ? "Try adjusting your search or filters."
                : "Upload some data to get started with AI insights."}
            </p>
            <Button onClick={() => setShowUploadModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Data
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIInsights;
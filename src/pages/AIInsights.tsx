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
  MessageSquare,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAIInsights } from "@/hooks/useAIInsights";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LiveInsight {
  id: string;
  title: string;
  content: string;
  priority: "High" | "Medium" | "Low";
  confidence: number;
  category: string;
  key_findings: string[];
  recommendations: string[];
  projected_impact: string;
  source: string;
  isStreaming: boolean;
  createdAt: Date;
}

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
  const [liveInsights, setLiveInsights] = useState<LiveInsight[]>([]);
  const [streamingInsight, setStreamingInsight] = useState<LiveInsight | null>(null);
  
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

  // Extract text content from file
  const extractFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Stream insights from Gemini AI
  const streamInsights = async (content: string, source: string) => {
    const insightId = `live-${Date.now()}`;
    
    // Create initial streaming insight
    const newInsight: LiveInsight = {
      id: insightId,
      title: "Analyzing...",
      content: "",
      priority: "Medium",
      confidence: 0,
      category: "Operations",
      key_findings: [],
      recommendations: [],
      projected_impact: "",
      source: source,
      isStreaming: true,
      createdAt: new Date()
    };

    setStreamingInsight(newInsight);
    setLiveInsights(prev => [newInsight, ...prev]);

    try {
      // Call Edge Function for streaming insights
      const response = await supabase.functions.invoke('stream-insights', {
        body: {
          content: content,
          source: source
        }
      });

      if (response.error) {
        throw response.error;
      }

      // Parse the streaming response
      const result = response.data;
      
      // Update the insight with final data
      const finalInsight: LiveInsight = {
        ...newInsight,
        title: result.title || "AI Insight",
        content: result.content || "",
        priority: result.priority || "Medium",
        confidence: result.confidence || 75,
        category: result.category || "Operations",
        key_findings: result.key_findings || [],
        recommendations: result.recommendations || [],
        projected_impact: result.projected_impact || "",
        isStreaming: false
      };

      // Update live insights
      setLiveInsights(prev => 
        prev.map(insight => 
          insight.id === insightId ? finalInsight : insight
        )
      );

      // Save to Supabase
      await supabase.from('ai_insights').insert({
        user_id: user?.id,
        title: finalInsight.title,
        category: finalInsight.category,
        priority: finalInsight.priority,
        confidence: finalInsight.confidence / 100, // Convert to decimal
        summary: finalInsight.content,
        key_findings: finalInsight.key_findings,
        recommendations: finalInsight.recommendations,
        projected_impact: finalInsight.projected_impact,
        source: finalInsight.source,
        tags: []
      });

      toast({
        title: "Insight generated!",
        description: "Your AI insight has been saved and is ready for analysis.",
      });

    } catch (error) {
      console.error('Streaming failed:', error);
      
      // Update with error state
      const errorInsight: LiveInsight = {
        ...newInsight,
        title: "Analysis Failed",
        content: "Sorry, we couldn't analyze your data. Please try again.",
        isStreaming: false
      };

      setLiveInsights(prev => 
        prev.map(insight => 
          insight.id === insightId ? errorInsight : insight
        )
      );

      toast({
        title: "Analysis failed",
        description: "Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    } finally {
      setStreamingInsight(null);
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
      let content = "";
      let source = "Text Input";

      if (uploadFile) {
        content = await extractFileContent(uploadFile);
        source = uploadFile.name;
      } else {
        content = textInput;
      }

      // Start streaming insights immediately
      await streamInsights(content, source);

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

  // Combine database insights with live insights
  const allInsights = [...liveInsights, ...filteredInsights];

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
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Insights
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
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : allInsights.length}
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
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : allInsights.filter(i => i.priority?.toLowerCase() === 'high').length}
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
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 
                    allInsights.length > 0 
                      ? `${Math.round(allInsights.reduce((acc, i) => acc + (i.confidence || 0), 0) / allInsights.length)}%`
                      : '0%'
                  }
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
                <p className="text-sm text-muted-foreground">Live Analysis</p>
                <p className="text-2xl font-bold">
                  {streamingInsight ? (
                    <div className="flex items-center">
                      <Sparkles className="h-4 w-4 mr-1 animate-pulse text-blue-500" />
                      Active
                    </div>
                  ) : (
                    'Ready'
                  )}
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

      {/* Live Streaming Insight */}
      {streamingInsight && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center">
                <Sparkles className="h-4 w-4 mr-2 animate-pulse text-blue-500" />
                {streamingInsight.title}
              </h2>
              <div className="p-2 rounded-full bg-blue-100">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                {streamingInsight.content || "Analyzing your data..."}
              </p>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>Source: {streamingInsight.source}</span>
                <span>Priority: {streamingInsight.priority}</span>
                <span>Confidence: {streamingInsight.confidence}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading insights...</span>
        </div>
      ) : allInsights.filter(i => i.priority?.toLowerCase() === activeTab).length === 0 ? (
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
          {allInsights
            .filter(i => i.priority?.toLowerCase() === activeTab)
            .map((insight) => (
              <Card key={insight.id} className={`hover:shadow-md transition-shadow ${
                insight.isStreaming ? 'border-blue-200 bg-blue-50' : ''
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-lg font-semibold flex items-center">
                      {insight.isStreaming && <Sparkles className="h-4 w-4 mr-2 animate-pulse text-blue-500" />}
                      {insight.title}
                    </h2>
                    <div className={`p-2 rounded-full ${getPriorityColor(insight.priority)}`}>
                      {insight.isStreaming ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        getPriorityIcon(insight.priority)
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-3">
                    Confidence: {insight.confidence}% | {insight.content || insight.summary}
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
                      {new Date(insight.createdAt || insight.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center space-x-2">
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

      {!loading && allInsights.length === 0 && (
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
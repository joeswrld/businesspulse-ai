import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { Brain } from "lucide-react";

// Light Platform Styling
const dashboardStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  
  * {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .ai-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  }

  .ai-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-color: #d1d5db;
  }

  .ai-button {
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .ai-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .ai-input {
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    color: #374151;
  }

  .ai-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    outline: none;
  }

  .ai-input::placeholder {
    color: #9ca3af;
  }

  .ai-text {
    color: #111827;
  }

  .ai-text-secondary {
    color: #6b7280;
  }

  .ai-text-muted {
    color: #9ca3af;
  }

  .ai-border-glow {
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .ai-metric-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    transition: all 0.2s ease;
  }

  .ai-metric-card:hover {
    transform: translateY(-2px);
    border-color: #d1d5db;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .ai-pulse {
    animation: ai-pulse 2s infinite;
  }

  @keyframes ai-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .ai-scanner {
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.2), transparent);
    animation: ai-scan 2s infinite;
  }

  @keyframes ai-scan {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .ai-neon-text {
    color: #1f2937;
  }

  .ai-loading {
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.2), transparent);
    background-size: 200% 100%;
    animation: ai-loading 1.5s infinite;
  }

  @keyframes ai-loading {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .ai-file-upload {
    border: 2px dashed #d1d5db;
    background: #f9fafb;
    transition: all 0.2s ease;
  }

  .ai-file-upload:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .ai-file-upload.dragover {
    border-color: #3b82f6;
    background: #dbeafe;
    transform: scale(1.01);
  }

  .ai-theme-tag {
    background: #eff6ff;
    border: 1px solid #dbeafe;
    color: #1e40af;
    border-radius: 16px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 500;
    margin: 2px;
  }

  .ai-sentiment-positive {
    background: #f0fdf4;
    border-color: #bbf7d0;
    color: #166534;
  }

  .ai-sentiment-negative {
    background: #fef2f2;
    border-color: #fecaca;
    color: #991b1b;
  }

  .ai-sentiment-neutral {
    background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
    border: 1px solid #d1d5db;
    color: #4b5563;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .ai-priority-high {
    background: #fef2f2;
    border-color: #fecaca;
    color: #991b1b;
  }

  .ai-priority-medium {
    background: #fffbeb;
    border-color: #fed7aa;
    color: #92400e;
  }

  .ai-priority-low {
    background: #eff6ff;
    border-color: #dbeafe;
    color: #1e40af;
  }

  .fade-in {
    animation: fadeIn 0.5s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .ai-file-upload {
    border: 2px dashed #d1d5db;
    background: #f9fafb;
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .ai-file-upload:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .ai-file-upload.dragover {
    border-color: #3b82f6;
    background: #dbeafe;
    transform: scale(1.01);
  }

  .file-preview {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px;
    font-family: monospace;
    font-size: 12px;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
  }
`;

interface InsightsData {
  summary: string;
  sentiment: "positive" | "negative" | "neutral";
  sentiment_confidence?: number;
  sentiment_reasoning?: string;
  key_themes: Array<{
    theme: string;
    confidence: number;
    frequency: string;
    description: string;
  } | string>;
  suggested_actions: Array<{
    action: string;
    priority: string;
    confidence: number;
    impact: string;
  } | string>;
  overall_confidence?: number;
  data_quality_score?: number;
  analysis_notes?: string;
  source_file?: string; // Added for file upload history
}

export default function InsightsPage() {
  const { user } = useAuth();
  const { checkUsage, incrementUsage, usage } = useUsageTracking();
  
  const [input, setInput] = useState("");
  const [result, setResult] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [insightsHistory, setInsightsHistory] = useState<Array<InsightsData & { id: string; timestamp: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const [confidenceMetrics, setConfidenceMetrics] = useState<any>(null);
  
  // File upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [fileProcessing, setFileProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const SUPPORTED_TYPES = {
    'text/csv': '.csv',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt'
  };

  // Load insights history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('insightsHistory');
      if (saved) {
        setInsightsHistory(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load insights history:', err);
    }
  }, []);

  // Save insights history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('insightsHistory', JSON.stringify(insightsHistory));
    } catch (err) {
      console.error('Failed to save insights history:', err);
    }
  }, [insightsHistory]);

  // File processing functions
  const processCSV = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          const lines = csv.split('\n');
          const headers = lines[0]?.split(',') || [];
          
          let processedText = `CSV File: ${file.name}\n\n`;
          processedText += `Headers: ${headers.join(', ')}\n\n`;
          processedText += `Data:\n`;
          
          const dataRows = lines.slice(1, 101);
          dataRows.forEach((line, index) => {
            if (line.trim()) {
              processedText += `Row ${index + 1}: ${line}\n`;
            }
          });
          
          if (lines.length > 101) {
            processedText += `\n... and ${lines.length - 101} more rows\n`;
          }
          
          resolve(processedText);
        } catch (err) {
          reject(new Error('Failed to process CSV file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read CSV file'));
      reader.readAsText(file);
    });
  };

  const processTXT = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          resolve(`Text File: ${file.name}\n\n${text}`);
        } catch (err) {
          reject(new Error('Failed to process text file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  };

  const processPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          let text = '';
          for (let i = 0; i < uint8Array.length; i++) {
            if (uint8Array[i] >= 32 && uint8Array[i] <= 126) {
              text += String.fromCharCode(uint8Array[i]);
            }
          }
          
          text = text.replace(/[^\x20-\x7E\n\r\t]/g, '');
          text = text.replace(/\s+/g, ' ').trim();
          
          resolve(`PDF File: ${file.name}\n\n${text.substring(0, 10000)}${text.length > 10000 ? '...' : ''}`);
        } catch (err) {
          reject(new Error('Failed to process PDF file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read PDF file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const processDOCX = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          let text = '';
          for (let i = 0; i < uint8Array.length; i++) {
            if (uint8Array[i] >= 32 && uint8Array[i] <= 126) {
              text += String.fromCharCode(uint8Array[i]);
            }
          }
          
          text = text.replace(/[^\x20-\x7E\n\r\t]/g, '');
          text = text.replace(/\s+/g, ' ').trim();
          
          resolve(`DOCX File: ${file.name}\n\n${text.substring(0, 10000)}${text.length > 10000 ? '...' : ''}`);
        } catch (err) {
          reject(new Error('Failed to process DOCX file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read DOCX file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    setFileProcessing(true);
    try {
      let extractedText = '';
      
      switch (file.type) {
        case 'text/csv':
          extractedText = await processCSV(file);
          break;
        case 'text/plain':
          extractedText = await processTXT(file);
          break;
        case 'application/pdf':
          extractedText = await processPDF(file);
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          extractedText = await processDOCX(file);
          break;
        default:
          throw new Error('Unsupported file type');
      }
      
      setExtractedText(extractedText);
      setInput(extractedText);
      toast.success(`File processed successfully! Extracted ${extractedText.length} characters.`);
      return extractedText;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process file';
      toast.error(errorMessage);
      throw err;
    } finally {
      setFileProcessing(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      return;
    }

    if (!Object.keys(SUPPORTED_TYPES).includes(file.type)) {
      toast.error('Unsupported file type. Please upload CSV, PDF, DOCX, or TXT files.');
      return;
    }

    setUploadedFile(file);
    await extractTextFromFile(file);
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
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setExtractedText("");
    setInput("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAnalyze = async () => {
    if (!input.trim()) {
              toast.error("Please provide some data to analyze.");
      return;
    }

    if (input.length > 500000) {
      toast.error("Input is too long. Please keep it under 10,000 characters.");
      return;
    }

    // Check usage limits before proceeding
    if (user) {
      const canAnalyze = await checkUsage('ai_insights', 1);
      if (!canAnalyze) {
        toast.error("AI Insights limit reached. Please upgrade your plan to continue generating strategic intelligence.");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Enhanced prompt for strategic business intelligence
      const enhancedInput = `Transform this raw business data into strategic intelligence:

${input}

Please analyze this data and provide:
1. Executive Summary with strategic implications
2. Key Business Insights with actionable recommendations
3. Risk Assessment and opportunities
4. Strategic Action Plan with priority levels
5. Performance Metrics and KPIs to track
6. Competitive Intelligence insights
7. Market Trend Analysis
8. Resource Allocation recommendations

Focus on transforming raw data into strategic business intelligence that drives decision-making.`;

      const res = await fetch(
        "https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/insightsAnalysis",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84"
          },
          body: JSON.stringify({ data: enhancedInput }),
        }
      );

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const json = await res.json();
      if (json.error) throw new Error(json.error);
      
      if (!json.result) {
        throw new Error("Invalid response from analysis service.");
      }

      // Increment usage after successful analysis
      if (user) {
        await incrementUsage('ai_insights', 1);
      }

      setResult(json.result);
      
      // Set confidence metrics for real-time display
      setConfidenceMetrics({
        overall: json.result.overall_confidence || 0,
        sentiment: json.result.sentiment_confidence || 0,
        dataQuality: json.result.data_quality_score || 0
      });
      

      
      // Add to history with strategic intelligence metadata
      const newInsight = {
        ...json.result,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        strategic_value: calculateStrategicValue(json.result),
        business_impact: assessBusinessImpact(json.result)
      };

      setInsightsHistory(prev => [newInsight, ...prev]);
      setInput("");

      // Show success toast with strategic intelligence summary
      const sentimentEmoji = json.result.sentiment === "positive" ? "🚀" : 
                            json.result.sentiment === "negative" ? "⚠️" : "📊";
      const confidenceLevel = json.result.overall_confidence || 0;
      const confidenceText = confidenceLevel >= 80 ? "High" : confidenceLevel >= 60 ? "Medium" : "Low";
      
      toast.success(`${sentimentEmoji} Strategic Intelligence Generated! (${confidenceText} Confidence)`, {
        description: `Transformed raw data into ${json.result.key_themes.length} strategic themes and ${json.result.suggested_actions.length} actionable recommendations. Overall confidence: ${confidenceLevel}%`
      });

    } catch (err) {
      let errorMessage = "Strategic analysis failed";
      
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = "Network error. Please check your connection.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Analysis error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for strategic intelligence
  const calculateStrategicValue = (insight: InsightsData): number => {
    let value = 0;
    
    // Base value from confidence
    value += (insight.overall_confidence || 0) * 0.3;
    
    // Value from themes (more themes = higher value)
    const themeCount = Array.isArray(insight.key_themes) ? insight.key_themes.length : 0;
    value += Math.min(themeCount * 10, 50);
    
    // Value from actions (more actions = higher value)
    const actionCount = Array.isArray(insight.suggested_actions) ? insight.suggested_actions.length : 0;
    value += Math.min(actionCount * 8, 40);
    
    // Sentiment bonus
    if (insight.sentiment === 'positive') value += 15;
    else if (insight.sentiment === 'negative') value += 10; // Negative insights can be valuable for risk mitigation
    else value += 5;
    
    return Math.min(Math.round(value), 100);
  };

  const assessBusinessImpact = (insight: InsightsData): 'high' | 'medium' | 'low' => {
    const strategicValue = calculateStrategicValue(insight);
    
    if (strategicValue >= 70) return 'high';
    if (strategicValue >= 40) return 'medium';
    return 'low';
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear all insights history? This cannot be undone.")) {
      setInsightsHistory([]);
      setResult(null);
      toast.success("Insights history cleared.");
    }
  };

  const exportInsights = () => {
    const dataStr = JSON.stringify(insightsHistory, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `insights-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Insights exported successfully!");
  };

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === "positive") return "bg-green-200 text-green-800 border-green-300";
    if (sentiment === "negative") return "bg-red-200 text-red-800 border-red-300";
    return "bg-gray-200 text-gray-800 border-gray-300";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 80) return "High";
    if (confidence >= 60) return "Medium";
    return "Low";
  };

  const getPriorityColor = (priority: string) => {
    if (priority === "high") return "bg-red-100 text-red-800 border-red-300";
    if (priority === "medium") return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-blue-100 text-blue-800 border-blue-300";
  };

  const getFrequencyColor = (frequency: string) => {
    if (frequency === "high") return "bg-purple-100 text-purple-800 border-purple-300";
    if (frequency === "medium") return "bg-blue-100 text-blue-800 border-blue-300";
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😔';
      default: return '😐';
    }
  };

  const calculateAverageConfidence = () => {
    if (insightsHistory.length === 0) return 0;
    
    // Calculate confidence based on sentiment strength and analysis quality
    const totalConfidence = insightsHistory.reduce((sum, insight) => {
      let confidence = 75; // Base confidence
      
      // Adjust based on sentiment
      if (insight.sentiment === 'positive') confidence += 10;
      if (insight.sentiment === 'negative') confidence += 5;
      
      // Adjust based on number of themes and actions
      if (insight.key_themes && insight.key_themes.length > 2) confidence += 5;
      if (insight.suggested_actions && insight.suggested_actions.length > 2) confidence += 5;
      
      // Cap at 95%
      return sum + Math.min(confidence, 95);
    }, 0);
    
    return Math.round(totalConfidence / insightsHistory.length);
  };

  const calculateSentimentDistribution = () => {
    if (insightsHistory.length === 0) return 'N/A';
    
    const sentimentCounts = insightsHistory.reduce((counts, insight) => {
      const sentiment = insight.sentiment || 'neutral';
      counts[sentiment] = (counts[sentiment] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const total = insightsHistory.length;
    const positive = sentimentCounts.positive || 0;
    const negative = sentimentCounts.negative || 0;
    const neutral = sentimentCounts.neutral || 0;
    
    // Return the dominant sentiment with percentage
    if (positive >= negative && positive >= neutral) {
      return `${Math.round((positive / total) * 100)}% Positive`;
    } else if (negative >= positive && negative >= neutral) {
      return `${Math.round((negative / total) * 100)}% Negative`;
    } else {
      return `${Math.round((neutral / total) * 100)}% Neutral`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style dangerouslySetInnerHTML={{ __html: dashboardStyles }} />
      
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="ai-pulse">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold ai-text ai-neon-text">Strategic Intelligence Hub</h1>
          </div>
          <p className="ai-text-secondary text-lg">Transform raw business data into strategic intelligence with AI-powered analysis</p>
          
          {/* AI Status Indicator */}
          <div className="flex items-center space-x-2 mt-3">
            <div className="w-2 h-2 bg-green-500 rounded-full ai-pulse"></div>
            <span className="ai-text-muted text-sm">AI Engine Online • Ready for Analysis</span>
          </div>
          
          {/* Real-Time Usage Indicator */}
          {user && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900">AI Insights Usage</h4>
                    <p className="text-sm text-blue-700">
                      {usage.ai_insights.current} of {usage.ai_insights.limit === -1 ? '∞' : usage.ai_insights.limit} insights used
                      {usage.ai_insights.limit !== -1 && (
                        <span className="ml-2 text-xs">
                          ({Math.round((usage.ai_insights.current / usage.ai_insights.limit) * 100)}%)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-600 font-medium">Real-time</span>
                </div>
              </div>
              {usage.ai_insights.limit !== -1 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-blue-600 mb-1">
                    <span>Usage Progress</span>
                    <span>{usage.ai_insights.remaining} remaining</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        usage.ai_insights.current / usage.ai_insights.limit >= 0.9 
                          ? 'bg-red-500' 
                          : usage.ai_insights.current / usage.ai_insights.limit >= 0.75 
                            ? 'bg-yellow-500' 
                            : 'bg-blue-500'
                      }`}
                      style={{ 
                        width: `${Math.min((usage.ai_insights.current / usage.ai_insights.limit) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Enhanced Statistics Section */}
        {insightsHistory.length > 0 ? (
          <div className="mt-6 ai-card p-6 ai-border-glow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="ai-scanner w-1 h-6 bg-blue-500 rounded-full"></div>
                <h3 className="text-xl font-semibold ai-text ai-neon-text">Analysis Metrics</h3>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full ai-pulse"></div>
                  <span className="ai-text-muted text-sm">Live Data</span>
                </div>
                <span className="ai-text-muted text-sm">•</span>
                <span className="ai-text-muted text-sm">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Total Analyses */}
              <div className="ai-metric-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium ai-text-muted">Total Analyses</p>
                    <p className="text-3xl font-bold ai-text ai-neon-text">{insightsHistory.length}</p>
                  </div>
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Average Confidence */}
              <div className="ai-metric-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium ai-text-muted">AI Confidence</p>
                    <p className="text-3xl font-bold text-green-600 ai-neon-text">
                      {calculateAverageConfidence()}%
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Sentiment Distribution */}
              <div className="ai-metric-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium ai-text-muted">Sentiment</p>
                    <p className="text-3xl font-bold text-purple-600 ai-neon-text">
                      {calculateSentimentDistribution()}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <div className="text-2xl">
                      {getSentimentEmoji(calculateSentimentDistribution().includes('Positive') ? 'positive' : 
                        calculateSentimentDistribution().includes('Negative') ? 'negative' : 'neutral')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="ai-metric-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium ai-text-muted">Actions</p>
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={exportInsights}
                        className="px-3 py-1 text-xs ai-button rounded-lg font-medium"
                      >
                        Export
                      </button>
                      <button
                        onClick={clearHistory}
                        className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 ai-card p-8 ai-border-glow">
            <div className="text-center">
              <div className="h-20 w-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold ai-text ai-neon-text mb-3">AI Analysis Ready</h3>
              <p className="ai-text-secondary text-lg mb-6">Upload data or enter text to initiate AI-powered analysis</p>
              <div className="flex items-center justify-center space-x-4 text-sm ai-text-muted">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full ai-pulse"></div>
                  <span>Upload Files</span>
                </div>
                <span>•</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full ai-pulse"></div>
                  <span>Enter Text</span>
                </div>
                <span>•</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full ai-pulse"></div>
                  <span>Get Insights</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* File Upload */}
            <div className="ai-card p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold ai-text">Data Input</h2>
              </div>
            
                          <div
                className={`ai-file-upload rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${dragActive ? 'dragover' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.pdf,.docx,.txt"
                onChange={handleFileInput}
                className="hidden"
              />
              
              {fileProcessing ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="ai-loading w-6 h-6 rounded-full"></div>
                  <span className="ai-text-secondary">Processing data...</span>
                </div>
              ) : uploadedFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="ai-text font-medium">{uploadedFile.name}</span>
                  </div>
                  <p className="ai-text-muted text-sm">
                    {extractedText.length} characters extracted
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    className="text-sm text-red-500 hover:text-red-600 underline transition-colors"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                    <svg className="h-8 w-8 text-white" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="ai-text">
                    <p className="font-medium text-lg">Upload Data</p>
                    <p className="ai-text-muted text-sm mt-1">CSV, PDF, DOCX, TXT (max 10MB)</p>
                  </div>
                </div>
              )}
            </div>

            {extractedText && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Extracted Text Preview</h3>
                <div className="file-preview">
                  {extractedText.length > 500 
                    ? `${extractedText.substring(0, 500)}...` 
                    : extractedText}
                </div>
              </div>
            )}
          </div>

          {/* Text Input */}
          <div className="ai-card p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold ai-text">Text Processing</h2>
            </div>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter text for AI analysis..."
              className="w-full p-4 ai-input rounded-xl min-h-[120px] resize-none focus:outline-none"
              disabled={loading}
            />
            
            <div className="mt-2 ai-text-muted text-sm">
              {input.length}/500,000 characters
            </div>
            
            {/* Real-time Confidence Indicator */}
            {loading && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">AI Analysis in Progress</span>
                  <div className="flex items-center gap-2">
                    <div className="ai-loading w-4 h-4 rounded-full"></div>
                    <span className="text-xs text-blue-600">Processing...</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Sentiment Analysis</span>
                    <span className="text-blue-600">Analyzing...</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Theme Extraction</span>
                    <span className="text-blue-600">Identifying...</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Action Generation</span>
                    <span className="text-blue-600">Generating...</span>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={handleAnalyze} 
              disabled={loading || !input.trim()}
              className="mt-4 ai-button px-6 py-3 rounded-xl disabled:opacity-50 flex items-center space-x-2 transition-all w-full justify-center font-semibold"
            >
              {loading ? (
                <>
                  <div className="ai-loading w-5 h-5 rounded-full"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>🚀 Generate Strategic Intelligence</span>
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg fade-in">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Insights Dashboard */}
        <div className="space-y-6 mt-8">
          {result ? (
            <div className="space-y-6 fade-in">
              {/* Summary Card */}
              <div className="ai-card p-6 ai-border-glow">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold ai-text ai-neon-text">Analysis Summary</h2>
                </div>
                
                <p className="ai-text-secondary text-lg mb-6 leading-relaxed">{result.summary}</p>
                
                {/* AI Confidence Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-700 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Overall Confidence
                      </span>
                      <span className={`text-lg font-bold ${getConfidenceColor(result.overall_confidence || 0)}`}>
                        {result.overall_confidence || 0}%
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-blue-200 rounded-full h-3 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-700 ease-out shadow-sm" 
                          style={{ width: `${result.overall_confidence || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-blue-600">
                          {getConfidenceText(result.overall_confidence || 0)} Confidence
                        </span>
                        <span className="text-xs text-blue-500 font-medium">
                          {result.overall_confidence || 0}/100
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-700 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Sentiment Confidence
                      </span>
                      <span className={`text-lg font-bold ${getConfidenceColor(result.sentiment_confidence || 0)}`}>
                        {result.sentiment_confidence || 0}%
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-green-200 rounded-full h-3 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-700 ease-out shadow-sm" 
                          style={{ width: `${result.sentiment_confidence || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-green-600">
                          {getConfidenceText(result.sentiment_confidence || 0)} Confidence
                        </span>
                        <span className="text-xs text-green-500 font-medium">
                          {result.sentiment_confidence || 0}/100
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-700 flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        Data Quality
                      </span>
                      <span className={`text-lg font-bold ${getConfidenceColor(result.data_quality_score || 0)}`}>
                        {result.data_quality_score || 0}%
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-purple-200 rounded-full h-3 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-700 ease-out shadow-sm" 
                          style={{ width: `${result.data_quality_score || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-purple-600">
                          {getConfidenceText(result.data_quality_score || 0)} Quality
                        </span>
                        <span className="text-xs text-purple-500 font-medium">
                          {result.data_quality_score || 0}/100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* AI Sentiment Analysis */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">AI Analysis:</span>
                      <span className={`px-4 py-2 rounded-full text-sm font-medium ai-theme-tag ${
                        result.sentiment === 'positive' ? 'ai-sentiment-positive' : 
                        result.sentiment === 'negative' ? 'ai-sentiment-negative' : 
                        'ai-sentiment-neutral'
                      }`}>
                        {getSentimentEmoji(result.sentiment)} {result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1)}
                      </span>
                    </div>
                    {result.sentiment_reasoning && (
                      <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                        💭 {result.sentiment_reasoning}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Analysis Notes */}
                {result.analysis_notes && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm font-medium text-blue-700">Analysis Notes:</span>
                    <p className="text-sm text-blue-600 mt-1">{result.analysis_notes}</p>
                  </div>
                )}
              </div>

              {/* Key Themes Card */}
              {result.key_themes && result.key_themes.length > 0 && (
                <div className="ai-card p-6 ai-border-glow">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold ai-text ai-neon-text">Key Themes</h2>
                  </div>
                  <div className="space-y-3">
                    {result.key_themes.map((theme, index) => {
                      const themeData = typeof theme === 'string' ? { theme, confidence: 70, frequency: 'medium', description: 'Theme identified' } : theme;
                      return (
                        <div key={index} className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-medium text-purple-800">{themeData.theme}</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFrequencyColor(themeData.frequency)}`}>
                                {themeData.frequency} frequency
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(themeData.confidence)}`}>
                                {themeData.confidence}% confidence
                              </span>
                            </div>
                          </div>
                          {themeData.description && (
                            <p className="text-sm text-purple-600">{themeData.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Suggested Actions Card */}
              {result.suggested_actions && result.suggested_actions.length > 0 && (
                <div className="ai-card p-6 ai-border-glow">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold ai-text ai-neon-text">Suggested Actions</h2>
                  </div>
                  <div className="space-y-4">
                    {result.suggested_actions.map((action, index) => {
                      const actionData = typeof action === 'string' ? { action, priority: 'medium', confidence: 70, impact: 'Expected to improve user experience' } : action;
                      return (
                        <div key={index} className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              <p className="ai-text-secondary leading-relaxed mb-2">{actionData.action}</p>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(actionData.priority)}`}>
                                  {actionData.priority} priority
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(actionData.confidence)}`}>
                                  {actionData.confidence}% confidence
                                </span>
                              </div>
                              {actionData.impact && (
                                <p className="text-xs text-green-600 mt-2 bg-green-50 px-2 py-1 rounded">
                                  💡 {actionData.impact}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="ai-card p-8 text-center ai-border-glow">
              <div className="h-20 w-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold ai-text ai-neon-text mb-3">AI Analysis Ready</h3>
              <p className="ai-text-secondary text-lg">Upload data or enter text to initiate AI-powered analysis</p>
            </div>
          )}
        </div>
      </div>

      {/* History Section */}
      {insightsHistory.length > 0 && (
        <div className="mt-12">
          <div className="ai-card p-6 ai-border-glow">
            <div className="flex items-center space-x-3 mb-6">
              <div className="h-8 w-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold ai-text ai-neon-text">Analysis History</h2>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
                              {insightsHistory.map((item) => (
                  <div key={item.id} className="ai-card p-4 hover:scale-105 transition-transform">
                    {item.source_file && (
                      <div className="mb-3">
                        <span className="ai-theme-tag text-xs">
                          📎 {item.source_file}
                        </span>
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <h3 className="text-sm font-medium ai-text-muted mb-2">Summary</h3>
                      <p className="ai-text-secondary text-sm bg-blue-50 p-3 rounded-xl border border-blue-200">
                        {item.summary}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ai-theme-tag ${
                          item.sentiment === "positive" ? "ai-sentiment-positive" :
                          item.sentiment === "negative" ? "ai-sentiment-negative" :
                          "ai-sentiment-neutral"
                        }`}>
                          {item.sentiment}
                        </span>
                        <span className="ai-text-muted text-xs">
                          {item.key_themes.length} themes, {item.suggested_actions.length} actions
                        </span>
                      </div>
                      <span className="ai-text-muted text-xs">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
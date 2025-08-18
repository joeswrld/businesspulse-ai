"use client";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

// CSS for enhanced styling
const dashboardStyles = `
  .insight-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  }

  .insight-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  .theme-tag {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    margin: 2px;
  }

  .theme-tag.positive {
    background: #dcfce7;
    color: #166534;
  }

  .theme-tag.negative {
    background: #fee2e2;
    color: #991b1b;
  }

  .theme-tag.neutral {
    background: #f3f4f6;
    color: #374151;
  }

  .priority-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .priority-badge.high {
    background: #fee2e2;
    color: #991b1b;
  }

  .priority-badge.medium {
    background: #fef3c7;
    color: #92400e;
  }

  .priority-badge.low {
    background: #dbeafe;
    color: #1e40af;
  }

  .trend-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
  }

  .trend-indicator.improving {
    background: #dcfce7;
    color: #166534;
  }

  .trend-indicator.declining {
    background: #fee2e2;
    color: #991b1b;
  }

  .trend-indicator.stable {
    background: #f3f4f6;
    color: #374151;
  }

  .suggestion-card {
    border-left: 4px solid;
    transition: all 0.2s ease;
  }

  .suggestion-card.high {
    border-left-color: #ef4444;
  }

  .suggestion-card.medium {
    border-left-color: #f59e0b;
  }

  .suggestion-card.low {
    border-left-color: #3b82f6;
  }

  .metric-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    padding: 20px;
    text-align: center;
  }

  .metric-value {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 4px;
  }

  .metric-label {
    font-size: 0.875rem;
    opacity: 0.9;
  }

  .file-upload-area {
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .file-upload-area:hover {
    border-color: #3b82f6;
    background-color: #f8fafc;
  }

  .file-upload-area.dragover {
    border-color: #3b82f6;
    background-color: #eff6ff;
  }

  .file-preview {
    max-height: 200px;
    overflow-y: auto;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .fade-in {
    animation: fadeIn 0.5s ease-in;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

interface InsightsData {
  summary: string;
  sentiment: {
    overall: string;
    confidence: number;
    breakdown: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
  themes?: Array<{
    name: string;
    frequency: number;
    sentiment: string;
    examples: string[];
  }>;
  suggestions?: Array<{
    action: string;
    priority: string;
    category: string;
    impact: string;
    effort?: string;
  }>;
  trends?: {
    sentiment_trend: string;
    key_insights: string[];
  };
  metrics?: {
    total_feedback_count: number;
    positive_ratio: number;
    negative_ratio: number;
    neutral_ratio: number;
  };
  processing_metadata?: {
    chunks_processed: number;
    categories_detected: string[];
    original_length: number;
    normalized_length: number;
  };
}

export default function ActionableInsights() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [insightsHistory, setInsightsHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
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
      const saved = localStorage.getItem('actionableInsights');
      if (saved) {
        setInsightsHistory(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load saved insights:', err);
    }
  }, []);

  // Save insights history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('actionableInsights', JSON.stringify(insightsHistory));
    } catch (err) {
      console.error('Failed to save insights:', err);
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

  const analyzeInsights = async () => {
    if (!input.trim()) {
      toast.error("Please provide some data before analyzing.");
      return;
    }

    if (input.length > 50000) {
      toast.error("Input is too long. Please keep it under 50,000 characters.");
      return;
    }

    if (loading) {
      toast.error("Analysis already in progress. Please wait.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(
        "https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/insightsAnalysis",
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84"
          },
          body: JSON.stringify({ data: input }),
        }
      );

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const json = await res.json();

      if (json.error) {
        throw new Error(json.error);
      }

      if (!json.result) {
        throw new Error("Invalid response from analysis service.");
      }

      // Handle both old and new response formats
      let processedInsights: InsightsData;
      
      if (typeof json.result.sentiment === 'string') {
        // Old format - convert to new format
        processedInsights = {
          summary: json.result.summary || "Analysis completed",
          sentiment: {
            overall: json.result.sentiment || "neutral",
            confidence: 0.7,
            breakdown: {
              positive: json.result.sentiment === "positive" ? 1 : 0,
              negative: json.result.sentiment === "negative" ? 1 : 0,
              neutral: json.result.sentiment === "neutral" ? 1 : 0
            }
          },
          themes: [],
          suggestions: [],
          trends: {
            sentiment_trend: "stable",
            key_insights: ["Analysis completed successfully"]
          },
          metrics: {
            total_feedback_count: 1,
            positive_ratio: json.result.sentiment === "positive" ? 1 : 0,
            negative_ratio: json.result.sentiment === "negative" ? 1 : 0,
            neutral_ratio: json.result.sentiment === "neutral" ? 1 : 0
          }
        };
      } else {
        // New format - use as is
        processedInsights = json.result;
      }

      setInsights(processedInsights);
      
      // Add to history
      const newInsight = {
        id: Date.now().toString(),
        input_text: input,
        insights: processedInsights,
        created_at: new Date().toISOString(),
        source_file: uploadedFile?.name || null
      };

      setInsightsHistory(prev => [newInsight, ...prev]);
      setInput("");
      
      // Show success toast
      toast.success("🎯 Actionable insights generated!", {
        description: `Found ${processedInsights.themes?.length || 0} themes and ${processedInsights.suggestions?.length || 0} suggestions.`
      });
    } catch (err) {
      let errorMessage = "Analysis failed";
      
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

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear all insights history? This cannot be undone.")) {
      setInsightsHistory([]);
      setInsights(null);
      toast.success("Insights history cleared.");
    }
  };

  const exportInsights = () => {
    const dataStr = JSON.stringify(insightsHistory, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `actionable-insights-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Insights exported successfully!");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <style dangerouslySetInnerHTML={{ __html: dashboardStyles }} />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🎯 Actionable Insights Dashboard</h1>
        <p className="text-gray-600">Transform feedback into actionable business intelligence with AI-powered analysis</p>
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Total analyses: {insightsHistory.length}
          </span>
          {insightsHistory.length > 0 && (
            <>
              <button
                onClick={exportInsights}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Export JSON
              </button>
              <button
                onClick={clearHistory}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Clear History
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          {/* File Upload */}
          <div className="insight-card p-6">
            <h2 className="text-xl font-semibold mb-4">📁 Upload File for Analysis</h2>
            
            <div
              className={`file-upload-area ${dragActive ? 'dragover' : ''}`}
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
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Processing file...</span>
                </div>
              ) : uploadedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-green-600 font-medium">{uploadedFile.name}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {extractedText.length} characters extracted
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    className="text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="text-gray-600">
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm">CSV, PDF, DOCX, TXT (max 10MB)</p>
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
          <div className="insight-card p-6">
            <h2 className="text-xl font-semibold mb-4">✍️ Or Enter Text Manually</h2>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your feedback, reviews, or any text data here for actionable insights..."
              className="w-full p-3 border rounded-lg min-h-[120px] resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            
            <div className="mt-2 text-sm text-gray-500">
              {input.length}/50,000 characters
            </div>
            
            <button 
              onClick={analyzeInsights} 
              disabled={loading || !input.trim()}
              className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg disabled:opacity-50 flex items-center space-x-2 hover:from-blue-700 hover:to-purple-700 transition-all w-full justify-center font-semibold"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>🎯 Generate Actionable Insights</span>
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg fade-in">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Insights Dashboard */}
        <div className="space-y-6">
          {insights ? (
            <div className="space-y-6 fade-in">
              {/* Summary Card */}
              <div className="insight-card p-6">
                <h2 className="text-xl font-semibold mb-4">📊 Analysis Summary</h2>
                <p className="text-gray-700 mb-4">{insights.summary}</p>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="metric-card">
                    <div className="metric-value">{Math.round((insights.metrics?.positive_ratio || 0) * 100)}%</div>
                    <div className="metric-label">Positive</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{Math.round((insights.metrics?.negative_ratio || 0) * 100)}%</div>
                    <div className="metric-label">Negative</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{Math.round((insights.metrics?.neutral_ratio || 0) * 100)}%</div>
                    <div className="metric-label">Neutral</div>
                  </div>
                </div>

                                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Overall Sentiment:</span>
                      <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                        insights.sentiment.overall === "positive" ? "bg-green-100 text-green-800" :
                        insights.sentiment.overall === "negative" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {insights.sentiment.overall}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        (Confidence: {Math.round(insights.sentiment.confidence * 100)}%)
                      </span>
                    </div>
                    {insights.trends && (
                      <div className={`trend-indicator ${insights.trends.sentiment_trend}`}>
                        {insights.trends.sentiment_trend === "improving" && "↗️"}
                        {insights.trends.sentiment_trend === "declining" && "↘️"}
                        {insights.trends.sentiment_trend === "stable" && "→"}
                        {insights.trends.sentiment_trend}
                      </div>
                    )}
                  </div>
              </div>

              {/* Themes Card */}
              {insights.themes && insights.themes.length > 0 && (
                <div className="insight-card p-6">
                  <h2 className="text-xl font-semibold mb-4">🎯 Key Themes</h2>
                  <div className="space-y-4">
                    {insights.themes.map((theme, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">{theme.name}</h3>
                          <span className={`theme-tag ${theme.sentiment}`}>
                            {theme.sentiment}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          Frequency: {theme.frequency} mentions
                        </div>
                        {theme.examples && theme.examples.length > 0 && (
                          <div className="text-sm text-gray-500">
                            <div className="font-medium mb-1">Examples:</div>
                            {theme.examples.slice(0, 2).map((example, i) => (
                              <div key={i} className="italic">"{example}"</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions Card */}
              {insights.suggestions && insights.suggestions.length > 0 && (
                <div className="insight-card p-6">
                  <h2 className="text-xl font-semibold mb-4">💡 Actionable Suggestions</h2>
                  <div className="space-y-4">
                    {insights.suggestions.map((suggestion, index) => (
                      <div key={index} className={`suggestion-card ${suggestion.priority} p-4 bg-gray-50 rounded-lg`}>
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-gray-900">{suggestion.action}</h3>
                          <div className="flex gap-2">
                            <span className={`priority-badge ${suggestion.priority}`}>
                              {suggestion.priority}
                            </span>
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                              {suggestion.category}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          Impact: <span className="font-medium">{suggestion.impact}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trends Card */}
              {insights.trends && insights.trends.key_insights && (
                <div className="insight-card p-6">
                  <h2 className="text-xl font-semibold mb-4">📈 Key Insights</h2>
                  <div className="space-y-2">
                    {insights.trends.key_insights.map((insight, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span className="text-gray-700">{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Processing Metadata */}
              {insights.processing_metadata && (
                <div className="insight-card p-6">
                  <h2 className="text-xl font-semibold mb-4">🔧 Processing Details</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-500">Chunks Processed:</span>
                      <span className="ml-2 text-gray-900">{insights.processing_metadata.chunks_processed}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Categories:</span>
                      <span className="ml-2 text-gray-900">{insights.processing_metadata.categories_detected.join(', ')}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Original Length:</span>
                      <span className="ml-2 text-gray-900">{insights.processing_metadata.original_length.toLocaleString()} chars</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Normalized Length:</span>
                      <span className="ml-2 text-gray-900">{insights.processing_metadata.normalized_length.toLocaleString()} chars</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="insight-card p-6 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready for Analysis</h3>
              <p className="text-gray-500">
                Upload a file or enter text to generate actionable insights with AI-powered analysis.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* History Section */}
      {insightsHistory.length > 0 && (
        <div className="mt-12">
          <div className="insight-card p-6">
            <h2 className="text-xl font-semibold mb-4">📚 Analysis History</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {insightsHistory.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  {item.source_file && (
                    <div className="mb-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        📎 {item.source_file}
                      </span>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Summary</h3>
                    <p className="text-gray-900 text-sm bg-gray-50 p-2 rounded">
                      {item.insights.summary}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (typeof item.insights.sentiment === 'string' ? item.insights.sentiment : item.insights.sentiment.overall) === "positive" ? "bg-green-100 text-green-800" :
                        (typeof item.insights.sentiment === 'string' ? item.insights.sentiment : item.insights.sentiment.overall) === "negative" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {typeof item.insights.sentiment === 'string' ? item.insights.sentiment : item.insights.sentiment.overall}
                      </span>
                      <span className="text-xs text-gray-500">
                        {item.insights.themes?.length || 0} themes, {item.insights.suggestions?.length || 0} suggestions
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleTimeString()}
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
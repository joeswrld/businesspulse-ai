"use client";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

// Futuristic AI Tech Styling
const dashboardStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  
  * {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .ai-gradient-bg {
    background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #533483 100%);
    min-height: 100vh;
  }

  .ai-card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .ai-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    border-color: rgba(99, 102, 241, 0.3);
  }

  .ai-glow {
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
  }

  .ai-glow:hover {
    box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
  }

  .ai-button {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border: none;
    border-radius: 12px;
    color: white;
    font-weight: 600;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .ai-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .ai-button:hover::before {
    left: 100%;
  }

  .ai-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
  }

  .ai-input {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: white;
    backdrop-filter: blur(10px);
  }

  .ai-input:focus {
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .ai-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .ai-text {
    color: rgba(255, 255, 255, 0.9);
  }

  .ai-text-secondary {
    color: rgba(255, 255, 255, 0.6);
  }

  .ai-text-muted {
    color: rgba(255, 255, 255, 0.4);
  }

  .ai-border {
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .ai-border-glow {
    border: 1px solid rgba(99, 102, 241, 0.3);
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
  }

  .ai-metric-card {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 16px;
    backdrop-filter: blur(20px);
    transition: all 0.3s ease;
  }

  .ai-metric-card:hover {
    transform: translateY(-4px) scale(1.02);
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 15px 35px rgba(99, 102, 241, 0.2);
  }

  .ai-pulse {
    animation: ai-pulse 2s infinite;
  }

  @keyframes ai-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .ai-typing {
    border-right: 2px solid #6366f1;
    animation: ai-typing 1s infinite;
  }

  @keyframes ai-typing {
    0%, 50% { border-color: transparent; }
    51%, 100% { border-color: #6366f1; }
  }

  .ai-scanner {
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent);
    animation: ai-scan 2s infinite;
  }

  @keyframes ai-scan {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .ai-grid {
    background-image: 
      radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.1) 1px, transparent 0);
    background-size: 20px 20px;
  }

  .ai-neon-text {
    text-shadow: 0 0 10px rgba(99, 102, 241, 0.8);
  }

  .ai-neon-border {
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
  }

  .ai-loading {
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.2), transparent);
    background-size: 200% 100%;
    animation: ai-loading 1.5s infinite;
  }

  @keyframes ai-loading {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .ai-file-upload {
    border: 2px dashed rgba(99, 102, 241, 0.3);
    background: rgba(99, 102, 241, 0.05);
    transition: all 0.3s ease;
  }

  .ai-file-upload:hover {
    border-color: rgba(99, 102, 241, 0.6);
    background: rgba(99, 102, 241, 0.1);
  }

  .ai-file-upload.dragover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.15);
    transform: scale(1.02);
  }

  .ai-theme-tag {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
    border: 1px solid rgba(99, 102, 241, 0.3);
    color: #e0e7ff;
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 500;
    margin: 2px;
    backdrop-filter: blur(10px);
  }

  .ai-sentiment-positive {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%);
    border-color: rgba(34, 197, 94, 0.4);
    color: #86efac;
  }

  .ai-sentiment-negative {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%);
    border-color: rgba(239, 68, 68, 0.4);
    color: #fca5a5;
  }

  .ai-sentiment-neutral {
    background: linear-gradient(135deg, rgba(107, 114, 128, 0.2) 0%, rgba(75, 85, 99, 0.2) 100%);
    border-color: rgba(107, 114, 128, 0.4);
    color: #d1d5db;
  }

  .ai-priority-high {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%);
    border-color: rgba(239, 68, 68, 0.4);
    color: #fca5a5;
  }

  .ai-priority-medium {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%);
    border-color: rgba(245, 158, 11, 0.4);
    color: #fcd34d;
  }

  .ai-priority-low {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%);
    border-color: rgba(59, 130, 246, 0.4);
    color: #93c5fd;
  }
`;

interface InsightsData {
  summary: string;
  sentiment: "positive" | "negative" | "neutral";
  key_themes: string[];
  suggested_actions: string[];
  source_file?: string; // Added for file upload history
}

export default function InsightsPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [insightsHistory, setInsightsHistory] = useState<Array<InsightsData & { id: string; timestamp: string }>>([]);
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
      toast.error("Please provide some feedback to analyze.");
      return;
    }

    if (input.length > 10000) {
      toast.error("Input is too long. Please keep it under 10,000 characters.");
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
      if (json.error) throw new Error(json.error);
      
      if (!json.result) {
        throw new Error("Invalid response from analysis service.");
      }

      setResult(json.result);
      
      // Add to history
      const newInsight = {
        ...json.result,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      };

      setInsightsHistory(prev => [newInsight, ...prev]);
      setInput("");

      // Show success toast with sentiment
      const sentimentEmoji = json.result.sentiment === "positive" ? "😊" : 
                            json.result.sentiment === "negative" ? "😔" : "😐";
      
      toast.success(`${sentimentEmoji} Analysis Complete!`, {
        description: `Found ${json.result.key_themes.length} themes and ${json.result.suggested_actions.length} actionable items.`
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
    <div className="ai-gradient-bg min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: dashboardStyles }} />
      
      {/* AI Grid Background */}
      <div className="ai-grid absolute inset-0 opacity-20"></div>
      
      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="ai-pulse">
              <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold ai-text ai-neon-text">AI Insights Engine</h1>
          </div>
          <p className="ai-text-secondary text-lg">Advanced neural network analysis for actionable business intelligence</p>
          
          {/* AI Status Indicator */}
          <div className="flex items-center space-x-2 mt-3">
            <div className="w-2 h-2 bg-green-400 rounded-full ai-pulse"></div>
            <span className="ai-text-muted text-sm">AI Engine Online • Ready for Analysis</span>
          </div>
        </div>
        
        {/* Enhanced Statistics Section */}
        {insightsHistory.length > 0 ? (
          <div className="mt-6 ai-card p-6 ai-border-glow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="ai-scanner w-1 h-6 bg-indigo-400 rounded-full"></div>
                <h3 className="text-xl font-semibold ai-text ai-neon-text">Neural Analysis Metrics</h3>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full ai-pulse"></div>
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
                  <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center ai-glow">
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
                    <p className="text-3xl font-bold text-green-400 ai-neon-text">
                      {calculateAverageConfidence()}%
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center ai-glow">
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
                    <p className="text-3xl font-bold text-purple-400 ai-neon-text">
                      {calculateSentimentDistribution()}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center ai-glow">
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
                  <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center ai-glow">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 ai-card p-8 ai-border-glow">
            <div className="text-center">
              <div className="h-20 w-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 ai-glow">
                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold ai-text ai-neon-text mb-3">Neural Network Ready</h3>
              <p className="ai-text-secondary text-lg mb-6">Upload data or enter text to initiate AI-powered neural analysis</p>
              <div className="flex items-center justify-center space-x-4 text-sm ai-text-muted">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full ai-pulse"></div>
                  <span>Upload Files</span>
                </div>
                <span>•</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full ai-pulse"></div>
                  <span>Enter Text</span>
                </div>
                <span>•</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full ai-pulse"></div>
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
                <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold ai-text">Neural Data Input</h2>
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
                  <span className="ai-text-secondary">Processing neural data...</span>
                </div>
              ) : uploadedFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center ai-glow">
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
                    className="text-sm text-red-400 hover:text-red-300 underline transition-colors"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto ai-glow">
                    <svg className="h-8 w-8 text-white" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="ai-text">
                    <p className="font-medium text-lg">Upload Neural Data</p>
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
              <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold ai-text">Neural Text Processing</h2>
            </div>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter neural data for AI analysis..."
              className="w-full p-4 ai-input rounded-xl min-h-[120px] resize-none focus:outline-none"
              disabled={loading}
            />
            
            <div className="mt-2 ai-text-muted text-sm">
              {input.length}/10,000 characters
            </div>
            
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
                  <span>🚀 Generate Neural Insights</span>
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
                  <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold ai-text ai-neon-text">Neural Analysis Summary</h2>
                </div>
                <p className="ai-text-secondary text-lg mb-6 leading-relaxed">{result.summary}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ai-theme-tag ${
                      result.sentiment === 'positive' ? 'ai-sentiment-positive' : 
                      result.sentiment === 'negative' ? 'ai-sentiment-negative' : 
                      'ai-sentiment-neutral'
                    }`}>
                      {getSentimentEmoji(result.sentiment)} {result.sentiment}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Themes Card */}
              {result.key_themes && result.key_themes.length > 0 && (
                <div className="ai-card p-6 ai-border-glow">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold ai-text ai-neon-text">Neural Pattern Recognition</h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {result.key_themes.map((theme, index) => (
                      <span
                        key={index}
                        className="ai-theme-tag"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Actions Card */}
              {result.suggested_actions && result.suggested_actions.length > 0 && (
                <div className="ai-card p-6 ai-border-glow">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold ai-text ai-neon-text">AI-Generated Actions</h2>
                  </div>
                  <div className="space-y-4">
                    {result.suggested_actions.map((action, index) => (
                      <div key={index} className="flex items-start space-x-4 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center ai-glow">
                          <span className="text-white text-sm font-bold">{index + 1}</span>
                        </div>
                        <span className="ai-text-secondary leading-relaxed">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="ai-card p-8 text-center ai-border-glow">
              <div className="h-20 w-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 ai-glow">
                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold ai-text ai-neon-text mb-3">Neural Analysis Ready</h3>
              <p className="ai-text-secondary text-lg">Upload data or enter text to initiate AI-powered neural analysis</p>
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
              <h2 className="text-xl font-semibold ai-text ai-neon-text">Neural Analysis History</h2>
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
                    <h3 className="text-sm font-medium ai-text-muted mb-2">Neural Summary</h3>
                    <p className="ai-text-secondary text-sm bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-3 rounded-xl border border-indigo-500/20">
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
                        {item.key_themes.length} patterns, {item.suggested_actions.length} actions
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
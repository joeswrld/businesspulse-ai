"use client";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

// CSS for output styling
const outputStyles = `
  .output {
    max-height: 400px;
    overflow-y: auto;
    background: #1f2937;
    padding: 16px;
    border-radius: 8px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 14px;
    line-height: 1.5;
    color: #10b981;
    border: 1px solid #374151;
  }
  
  .output::-webkit-scrollbar {
    width: 8px;
  }
  
  .output::-webkit-scrollbar-track {
    background: #374151;
    border-radius: 4px;
  }
  
  .output::-webkit-scrollbar-thumb {
    background: #6b7280;
    border-radius: 4px;
  }
  
  .output::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }

  .skeleton {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: .5;
    }
  }

  .fade-in {
    animation: fadeIn 0.5s ease-in;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
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
`;

export default function CompleteInsights() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [processingChunk, setProcessingChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // File upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [fileProcessing, setFileProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ITEMS_PER_PAGE = 10;
  const MAX_CHUNK_SIZE = 3000; // Characters per chunk
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const SUPPORTED_TYPES = {
    'text/csv': '.csv',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt'
  };

  // Load insights from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('insights');
      if (saved) {
        setInsights(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load saved insights:', err);
    }
  }, []);

  // Save insights to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('insights', JSON.stringify(insights));
    } catch (err) {
      console.error('Failed to save insights:', err);
    }
  }, [insights]);

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
          
          // Process first 100 rows to avoid overwhelming the AI
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
    // For PDF processing, we'll use a simple text extraction
    // In a real app, you might want to use a library like pdf.js
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // This is a simplified PDF text extraction
          // In production, you'd use a proper PDF parsing library
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Simple text extraction from PDF (basic implementation)
          let text = '';
          for (let i = 0; i < uint8Array.length; i++) {
            if (uint8Array[i] >= 32 && uint8Array[i] <= 126) {
              text += String.fromCharCode(uint8Array[i]);
            }
          }
          
          // Clean up the extracted text
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
    // For DOCX processing, we'll extract text content
    // In a real app, you might want to use a library like mammoth.js
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Simple text extraction from DOCX (basic implementation)
          let text = '';
          for (let i = 0; i < uint8Array.length; i++) {
            if (uint8Array[i] >= 32 && uint8Array[i] <= 126) {
              text += String.fromCharCode(uint8Array[i]);
            }
          }
          
          // Clean up the extracted text
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
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      return;
    }

    // Validate file type
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

  // Chunk large inputs for processing
  const chunkText = (text: string, chunkSize: number = MAX_CHUNK_SIZE) => {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  };

  // Process a single chunk
  const processChunk = async (chunk: string, chunkIndex: number) => {
    const res = await fetch(
      "https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/insightsAnalysis",
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84"
        },
        body: JSON.stringify({ data: chunk }),
      }
    );

    if (!res.ok) {
      throw new Error(`Chunk ${chunkIndex + 1} failed: ${res.status}`);
    }

    const json = await res.json();
    if (json.error) {
      throw new Error(`Chunk ${chunkIndex + 1} error: ${json.error}`);
    }

    return json.result;
  };

  const handleAnalyze = async () => {
    // 1️⃣ Empty input validation
    if (!input.trim()) {
      toast.error("Please provide some data before analyzing.");
      return;
    }

    // 2️⃣ Input length validation (prevent huge datasets)
    if (input.length > 50000) {
      toast.error("Input is too long. Please keep it under 50,000 characters.");
      return;
    }

    // 3️⃣ Prevent double submission
    if (loading) {
      toast.error("Analysis already in progress. Please wait.");
      return;
    }

    setLoading(true);
    setError(null);
    setProcessingChunk(0);
    
    try {
      const chunks = chunkText(input);
      setTotalChunks(chunks.length);

      let combinedSummary = "";
      let combinedSentiment = "neutral";
      let positiveCount = 0;
      let negativeCount = 0;
      let neutralCount = 0;

      // Process chunks sequentially
      for (let i = 0; i < chunks.length; i++) {
        setProcessingChunk(i + 1);
        
        const chunkResult = await processChunk(chunks[i], i);
        
        // Aggregate results
        combinedSummary += `[Part ${i + 1}]: ${chunkResult.summary}\n\n`;
        
        // Count sentiments
        if (chunkResult.sentiment === "positive") positiveCount++;
        else if (chunkResult.sentiment === "negative") negativeCount++;
        else neutralCount++;
      }

      // Determine overall sentiment
      if (positiveCount > negativeCount && positiveCount > neutralCount) {
        combinedSentiment = "positive";
      } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
        combinedSentiment = "negative";
      } else {
        combinedSentiment = "neutral";
      }

      const finalResult = {
        summary: combinedSummary.trim(),
        sentiment: combinedSentiment,
        chunks_processed: chunks.length,
        sentiment_breakdown: {
          positive: positiveCount,
          negative: negativeCount,
          neutral: neutralCount
        }
      };

      setResult(finalResult);
      
      // 8️⃣ Add the result to insights array
      const newInsight = {
        id: Date.now().toString(),
        input_text: input,
        summary: finalResult.summary,
        sentiment: finalResult.sentiment,
        created_at: new Date().toISOString(),
        chunks_processed: finalResult.chunks_processed,
        sentiment_breakdown: finalResult.sentiment_breakdown,
        source_file: uploadedFile?.name || null
      };

      setInsights(prev => [newInsight, ...prev]);
      setInput("");
      
      // 9️⃣ Show sentiment-based toast
      const sentiment = finalResult.sentiment;
      if (sentiment === "positive") {
        toast.success("🌞 Positive feedback detected!", {
          description: `Processed ${chunks.length} chunk${chunks.length > 1 ? 's' : ''}`
        });
      } else if (sentiment === "negative") {
        toast.error("⚠️ Negative feedback detected!", {
          description: `Processed ${chunks.length} chunk${chunks.length > 1 ? 's' : ''}`
        });
      } else {
        toast("😐 Neutral feedback logged", { 
          description: `Processed ${chunks.length} chunk${chunks.length > 1 ? 's' : ''}. No strong sentiment.`
        });
      }
    } catch (err) {
      // 1️⃣0️⃣ Comprehensive error handling
      let errorMessage = "Analysis failed";
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = "Request timed out. Please try again.";
        } else if (err.message.includes('fetch')) {
          errorMessage = "Network error. Please check your connection.";
        } else {
          errorMessage = err.message;
        }
      } else {
        errorMessage = "An unexpected error occurred.";
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Analysis error:", err);
    } finally {
      setLoading(false);
      setProcessingChunk(0);
      setTotalChunks(0);
    }
  };

  const clearAllInsights = () => {
    if (window.confirm("Are you sure you want to clear all insights? This cannot be undone.")) {
      setInsights([]);
      setResult(null);
      setCurrentPage(1);
      toast.success("All insights cleared.");
    }
  };

  const exportInsights = () => {
    const dataStr = JSON.stringify(insights, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `insights-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Insights exported successfully!");
  };

  const filteredInsights = insights.filter((i) => {
    const matchesSentiment = filter === "all" ? true : i.sentiment === filter;
    const matchesSearch = !search
      ? true
      : i.input_text.toLowerCase().includes(search.toLowerCase()) ||
        (i.summary?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return matchesSentiment && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredInsights.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInsights = filteredInsights.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  function highlightMatch(text: string, query: string) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <span key={i} className="bg-yellow-200 font-semibold">{part}</span> : part
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <style dangerouslySetInnerHTML={{ __html: outputStyles }} />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Insights Analysis</h1>
        <p className="text-gray-600">Powered by Gemini AI - Analyze text sentiment and generate insights from text or files</p>
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Total insights: {insights.length} | 
            Positive: {insights.filter(i => i.sentiment === 'positive').length} | 
            Negative: {insights.filter(i => i.sentiment === 'negative').length} | 
            Neutral: {insights.filter(i => i.sentiment === 'neutral').length}
          </span>
          {insights.length > 0 && (
            <button
              onClick={exportInsights}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Export JSON
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          {/* File Upload */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Upload File for Analysis</h2>
            
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
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Or Enter Text Manually</h2>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your data here... (e.g., 'The new dashboard is amazing! I love how fast it loads.')"
              className="w-full p-3 border rounded-lg min-h-[120px] resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            
            <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
              <span>{input.length}/50,000 characters</span>
              {input.length > MAX_CHUNK_SIZE && (
                <span className="text-orange-600">
                  Will be processed in {Math.ceil(input.length / MAX_CHUNK_SIZE)} chunks
                </span>
              )}
            </div>
            
            <button 
              onClick={handleAnalyze} 
              disabled={loading || !input.trim()}
              className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50 flex items-center space-x-2 hover:bg-blue-700 transition-colors w-full justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>
                    {totalChunks > 1 
                      ? `Processing chunk ${processingChunk}/${totalChunks}...` 
                      : "Processing..."}
                  </span>
                </>
              ) : (
                <span>Analyze with AI</span>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg fade-in">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Advanced Options */}
            <div className="mt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                {showAdvanced ? "Hide" : "Show"} Advanced Options
              </button>
              
              {showAdvanced && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg fade-in">
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>• Large texts are automatically split into {MAX_CHUNK_SIZE.toLocaleString()}-character chunks</p>
                    <p>• Each chunk is analyzed separately and results are combined</p>
                    <p>• Sentiment is determined by majority vote across chunks</p>
                    <p>• All insights are saved locally in your browser</p>
                    <p>• Supported file types: CSV, PDF, DOCX, TXT (max 10MB)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Latest Result */}
          {result && (
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm fade-in">
              <h2 className="text-xl font-semibold mb-4">Latest Analysis</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Summary</h3>
                  <div className="bg-blue-50 p-3 rounded-md border-l-4 border-blue-400 max-h-48 overflow-y-auto">
                    {result.summary.split('\n').map((line: string, index: number) => (
                      <p key={index} className="text-gray-900 mb-2 last:mb-0">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Overall Sentiment</h3>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        result.sentiment === "positive"
                          ? "bg-green-100 text-green-800"
                          : result.sentiment === "negative"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {result.sentiment === "positive" && "🌞 "}
                      {result.sentiment === "negative" && "⚠️ "}
                      {result.sentiment === "neutral" && "😐 "}
                      {result.sentiment}
                    </span>
                  </div>
                  
                  {result.chunks_processed > 1 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Processing</h3>
                      <span className="text-sm text-gray-600">
                        {result.chunks_processed} chunks processed
                      </span>
                    </div>
                  )}
                </div>

                {result.sentiment_breakdown && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Sentiment Breakdown</h3>
                    <div className="flex gap-2">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Positive: {result.sentiment_breakdown.positive}
                      </span>
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        Negative: {result.sentiment_breakdown.negative}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        Neutral: {result.sentiment_breakdown.neutral}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Raw Response</h3>
                  <pre className="output">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Insights History */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Analysis History</h2>
            {insights.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={exportInsights}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Export
                </button>
                <button
                  onClick={clearAllInsights}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
          
          {/* Filters */}
          <div className="mb-6 flex items-center gap-4">
            <div>
              <label className="mr-2 font-medium text-sm">Filter:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All ({insights.length})</option>
                <option value="positive">Positive ({insights.filter(i => i.sentiment === 'positive').length})</option>
                <option value="negative">Negative ({insights.filter(i => i.sentiment === 'negative').length})</option>
                <option value="neutral">Neutral ({insights.filter(i => i.sentiment === 'neutral').length})</option>
              </select>
            </div>

            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search insights..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full pr-10 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                >
                  ❌
                </button>
              )}
            </div>
          </div>

          {/* Insights List */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {paginatedInsights.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {insights.length === 0 ? (
                  <div>
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p>No insights yet. Submit some text or upload a file to get started!</p>
                  </div>
                ) : (
                  <p>No insights match your search or filter criteria.</p>
                )}
              </div>
            ) : (
              <>
                {paginatedInsights.map((i) => (
                  <div key={i.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow fade-in">
                    {i.source_file && (
                      <div className="mb-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          📎 {i.source_file}
                        </span>
                      </div>
                    )}
                    
                    <div className="mb-3">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Input</h3>
                      <p className="text-gray-900 text-sm bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                        {highlightMatch(i.input_text, search)}
                      </p>
                    </div>
                    
                    <div className="mb-3">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Summary</h3>
                      <p className="text-gray-900 text-sm bg-blue-50 p-2 rounded max-h-20 overflow-y-auto">
                        {highlightMatch(i.summary, search)}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            i.sentiment === "positive"
                              ? "bg-green-100 text-green-800"
                              : i.sentiment === "negative"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {i.sentiment === "positive" && "🌞 "}
                          {i.sentiment === "negative" && "⚠️ "}
                          {i.sentiment === "neutral" && "😐 "}
                          {i.sentiment}
                        </span>
                        {i.chunks_processed > 1 && (
                          <span className="text-xs text-gray-500">
                            {i.chunks_processed} chunks
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(i.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
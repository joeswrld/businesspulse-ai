"use client";
import { useState, useEffect } from "react";
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

  const ITEMS_PER_PAGE = 10;
  const MAX_CHUNK_SIZE = 3000; // Characters per chunk

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
        sentiment_breakdown: finalResult.sentiment_breakdown
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
        <p className="text-gray-600">Powered by Gemini AI - Analyze text sentiment and generate insights</p>
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
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Submit Text for Analysis</h2>
            
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
                    <p>No insights yet. Submit some text to get started!</p>
                  </div>
                ) : (
                  <p>No insights match your search or filter criteria.</p>
                )}
              </div>
            ) : (
              <>
                {paginatedInsights.map((i) => (
                  <div key={i.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow fade-in">
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
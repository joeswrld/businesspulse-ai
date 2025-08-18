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
`;

export default function CompleteInsights() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const handleAnalyze = async () => {
    // 1️⃣ Empty input validation
    if (!input.trim()) {
      toast.error("Please provide some data before analyzing.");
      return;
    }

    // 2️⃣ Input length validation (prevent huge datasets)
    if (input.length > 10000) {
      toast.error("Input is too long. Please keep it under 10,000 characters.");
      return;
    }

    // 3️⃣ Prevent double submission
    if (loading) {
      toast.error("Analysis already in progress. Please wait.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // 4️⃣ Network timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const res = await fetch(
        "https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/insightsAnalysis",
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84"
          },
          body: JSON.stringify({ data: input }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // 5️⃣ HTTP error handling
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Analysis service not found. Please check if the Edge Function is deployed.");
        } else if (res.status === 500) {
          throw new Error("Server error. Please try again later.");
        } else if (res.status === 429) {
          throw new Error("Too many requests. Please wait a moment before trying again.");
        } else {
          throw new Error(`Request failed with status ${res.status}`);
        }
      }

      const json = await res.json();

      // 6️⃣ API error handling
      if (json.error) {
        throw new Error(json.error);
      }

      // 7️⃣ Response validation
      if (!json.result || !json.result.summary || !json.result.sentiment) {
        throw new Error("Invalid response from analysis service.");
      }

      setResult(json.result);
      
      // 8️⃣ Add the result to insights array
      const newInsight = {
        id: Date.now().toString(),
        input_text: input,
        summary: json.result.summary,
        sentiment: json.result.sentiment,
        created_at: new Date().toISOString()
      };

      setInsights(prev => [newInsight, ...prev]);
      setInput("");
      
      // 9️⃣ Show sentiment-based toast
      const sentiment = json.result.sentiment;
      if (sentiment === "positive") {
        toast.success("🌞 Positive feedback detected!");
      } else if (sentiment === "negative") {
        toast.error("⚠️ Negative feedback detected!");
      } else {
        toast("😐 Neutral feedback logged", { description: "No strong sentiment." });
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
    }
  };

  const clearAllInsights = () => {
    if (window.confirm("Are you sure you want to clear all insights? This cannot be undone.")) {
      setInsights([]);
      setResult(null);
      toast.success("All insights cleared.");
    }
  };

  const filteredInsights = insights.filter((i) => {
    const matchesSentiment = filter === "all" ? true : i.sentiment === filter;
    const matchesSearch = !search
      ? true
      : i.input_text.toLowerCase().includes(search.toLowerCase()) ||
        (i.summary?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return matchesSentiment && matchesSearch;
  });

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
            
            <div className="mt-2 text-sm text-gray-500">
              {input.length}/10,000 characters
            </div>
            
            <button 
              onClick={handleAnalyze} 
              disabled={loading || !input.trim()}
              className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50 flex items-center space-x-2 hover:bg-blue-700 transition-colors"
            >
              {loading && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              )}
              <span>{loading ? "Processing..." : "Analyze with AI"}</span>
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Latest Result */}
          {result && (
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Latest Analysis</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Summary</h3>
                  <p className="text-gray-900 bg-blue-50 p-3 rounded-md border-l-4 border-blue-400">
                    {result.summary}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Sentiment</h3>
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
              <button
                onClick={clearAllInsights}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear All
              </button>
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
            {filteredInsights.length === 0 ? (
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
              filteredInsights.map((i) => (
                <div key={i.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Input</h3>
                    <p className="text-gray-900 text-sm bg-gray-50 p-2 rounded">
                      {highlightMatch(i.input_text, search)}
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Summary</h3>
                    <p className="text-gray-900 text-sm bg-blue-50 p-2 rounded">
                      {highlightMatch(i.summary, search)}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
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
                    <span className="text-xs text-gray-400">
                      {new Date(i.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
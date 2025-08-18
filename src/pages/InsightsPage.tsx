"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, "gi");
  return text.split(regex).map((part, i) =>
    regex.test(part) ? <span key={i} className="bg-yellow-200 font-semibold">{part}</span> : part
  );
}

export default function InsightsPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    // Initialize with empty insights array
    setInsights([]);
  }, []);



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
    
    try {
      // 4️⃣ Network timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const res = await fetch(
        "https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/insightsAnalysis",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
      
      toast.error(errorMessage);
      console.error("Analysis error:", err);
    } finally {
      setLoading(false);
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">AI Insights</h1>

      <textarea
        className="w-full p-3 border rounded-lg"
        placeholder="Paste your data here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
      >
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        )}
        <span>{loading ? "Processing..." : "Analyze"}</span>
      </button>

      <div className="mt-6 flex items-center gap-4">
        <div>
          <label className="mr-2 font-medium">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">All</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>

        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search insights..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full pr-10"
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

      <div className="mt-6 space-y-4">
        {filteredInsights.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No insights found</h3>
            <p className="text-gray-500">
              {search || filter !== "all" 
                ? "Try adjusting your search or filters."
                : "Submit some text above to get started with AI analysis."
              }
            </p>
          </div>
        ) : (
          filteredInsights.map((i) => (
            <div key={i.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Input Section */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Input Text</h3>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-md">
                    {highlightMatch(i.input_text, search)}
                  </p>
                </div>

                {/* Analysis Results */}
                {i.summary ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">AI Summary</h3>
                      <p className="text-gray-900 bg-blue-50 p-3 rounded-md border-l-4 border-blue-400">
                        {highlightMatch(i.summary, search)}
                      </p>
                    </div>

                    {/* Sentiment */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Sentiment Analysis</h3>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
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
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Analyzing with AI...</span>
                  </div>
                )}

                {/* Timestamp */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Analyzed on {new Date(i.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
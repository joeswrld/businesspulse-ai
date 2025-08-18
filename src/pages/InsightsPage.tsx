"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface InsightsData {
  summary: string;
  sentiment: "positive" | "negative" | "neutral";
  key_themes: string[];
  suggested_actions: string[];
}

export default function InsightsPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [insightsHistory, setInsightsHistory] = useState<Array<InsightsData & { id: string; timestamp: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  // Load history from localStorage
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

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('insightsHistory', JSON.stringify(insightsHistory));
    } catch (err) {
      console.error('Failed to save insights history:', err);
    }
  }, [insightsHistory]);

  const analyzeInsights = async () => {
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
      const response = await fetch(
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

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.result) {
        throw new Error("Invalid response from analysis service.");
      }

      setInsights(data.result);
      
      // Add to history
      const newInsight = {
        ...data.result,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      };

      setInsightsHistory(prev => [newInsight, ...prev]);
      setInput("");

      // Show success toast with sentiment
      const sentimentEmoji = data.result.sentiment === "positive" ? "😊" : 
                            data.result.sentiment === "negative" ? "😔" : "😐";
      
      toast.success(`${sentimentEmoji} Analysis Complete!`, {
        description: `Found ${data.result.key_themes.length} themes and ${data.result.suggested_actions.length} actionable items.`
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
    link.download = `insights-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Insights exported successfully!");
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 border-green-200';
      case 'negative': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😔';
      default: return '😐';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🎯 Professional Insights Dashboard</h1>
        <p className="text-gray-600">Transform feedback into actionable business intelligence</p>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">📝 Feedback Analysis</h2>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your customer feedback, reviews, or any text data here for professional analysis..."
              className="w-full p-4 border border-gray-300 rounded-lg min-h-[200px] resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            
            <div className="mt-2 text-sm text-gray-500">
              {input.length}/10,000 characters
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
                  <span>🔍 Generate Professional Insights</span>
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Insights Dashboard */}
        <div className="space-y-6">
          {insights ? (
            <div className="space-y-6 animate-fade-in">
              {/* Summary Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4">📊 Analysis Summary</h2>
                <p className="text-gray-700 mb-4 leading-relaxed">{insights.summary}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSentimentColor(insights.sentiment)}`}>
                      {getSentimentEmoji(insights.sentiment)} {insights.sentiment}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Themes Card */}
              {insights.key_themes && insights.key_themes.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-4">🎯 Key Themes</h2>
                  <div className="flex flex-wrap gap-2">
                    {insights.key_themes.map((theme, index) => (
                      <span
                        key={index}
                        className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Actions Card */}
              {insights.suggested_actions && insights.suggested_actions.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-4">✅ Suggested Actions</h2>
                  <div className="space-y-3">
                    {insights.suggested_actions.map((action, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 text-sm font-bold">{index + 1}</span>
                        </div>
                        <span className="text-gray-700">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready for Analysis</h3>
              <p className="text-gray-500">
                Enter feedback to generate professional insights with themes and actionable recommendations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* History Section */}
      {insightsHistory.length > 0 && (
        <div className="mt-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">📚 Analysis History</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {insightsHistory.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Summary</h3>
                    <p className="text-gray-900 text-sm bg-gray-50 p-3 rounded">
                      {item.summary}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSentimentColor(item.sentiment)}`}>
                        {getSentimentEmoji(item.sentiment)} {item.sentiment}
                      </span>
                      <span className="text-xs text-gray-500">
                        {item.key_themes.length} themes, {item.suggested_actions.length} actions
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in;
        }
      `}</style>
    </div>
  );
}
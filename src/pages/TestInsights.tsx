"use client";
import { useState } from "react";
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

export default function TestInsights() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    // 1️⃣ Empty input validation
    if (!input.trim()) {
      toast.error("Please provide some data before analyzing.");
      return;
    }

    // 2️⃣ Input length validation
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
      const timeoutId = setTimeout(() => controller.abort(), 30000);

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

      setResult(json.result);
      toast.success("✅ Analysis complete!");
    } catch (err) {
      // 8️⃣ Comprehensive error handling
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

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <style dangerouslySetInnerHTML={{ __html: outputStyles }} />
      <h1 className="text-2xl font-bold mb-4">Test Insights Analysis</h1>
      
      <div className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your data here..."
          className="w-full p-3 border rounded-lg min-h-[120px]"
        />
        
        <button 
          onClick={handleAnalyze} 
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center space-x-2"
        >
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          )}
          <span>{loading ? "Processing..." : "Analyze"}</span>
        </button>

        {result ? (
          <div className="mt-6">
            <h2 className="font-semibold mb-3">Analysis Result:</h2>
            <div className="space-y-4">
              {/* Formatted Result */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="space-y-3">
                  <div>
                    <strong className="text-gray-700">Summary:</strong>
                    <p className="mt-1 text-gray-800">{result.summary}</p>
                  </div>
                  <div>
                    <strong className="text-gray-700">Sentiment:</strong>
                    <span
                      className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${
                        result.sentiment === "positive"
                          ? "bg-green-100 text-green-800"
                          : result.sentiment === "negative"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {result.sentiment}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Raw JSON Output */}
              <div>
                <h3 className="font-medium mb-2 text-gray-700">Raw Response:</h3>
                <pre className="output bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 p-4 border rounded-lg bg-gray-50 text-center">
            <p className="text-gray-600">No analysis yet. Submit some data above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
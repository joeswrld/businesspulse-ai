"use client";
import { useState } from "react";
import { toast } from "sonner";

export default function TestInsights() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!input.trim()) {
      toast.error("Please provide some data");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        "https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/insightsAnalysis",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: input }), // send your input state
        }
      );

      const json = await res.json();

      if (json.error) throw new Error(json.error); // handle errors from Edge Function

      setResult(json.result); // render Gemini's analysis in your UI
      toast.success("✅ Analysis complete!");
    } catch (err) {
      toast.error("Analysis failed: " + err.message); // user-friendly error
    } finally {
      setLoading(false); // stop loading spinner
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
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
          className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "Processing..." : "Analyze"}
        </button>

        {result && (
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <h2 className="font-semibold mb-2">Analysis Result:</h2>
            <div className="space-y-2">
              <p><strong>Summary:</strong> {result.summary}</p>
              <p>
                <strong>Sentiment:</strong>{" "}
                <span
                  className={
                    result.sentiment === "positive"
                      ? "text-green-600 font-semibold"
                      : result.sentiment === "negative"
                      ? "text-red-600 font-semibold"
                      : "text-gray-600 font-semibold"
                  }
                >
                  {result.sentiment}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
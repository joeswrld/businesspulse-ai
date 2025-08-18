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

      // Add the result to insights array
      const newInsight = {
        id: Date.now().toString(), // temporary ID
        input_text: input,
        summary: json.result.summary,
        sentiment: json.result.sentiment,
        created_at: new Date().toISOString()
      };

      setInsights(prev => [newInsight, ...prev]);
      setInput("");
      
      // Show sentiment-based toast
      const sentiment = json.result.sentiment;
      if (sentiment === "positive") {
        toast.success("🌞 Positive feedback detected!");
      } else if (sentiment === "negative") {
        toast.error("⚠️ Negative feedback detected!");
      } else {
        toast("😐 Neutral feedback logged", { description: "No strong sentiment." });
      }
    } catch (err) {
      toast.error("Analysis failed: " + err.message); // user-friendly error
    } finally {
      setLoading(false); // stop loading spinner
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
        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg"
      >
        {loading ? "Processing..." : "Analyze"}
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
        {filteredInsights.map((i) => (
          <div key={i.id} className="p-4 border rounded-lg shadow-sm">
            <p className="text-gray-700"><b>Input:</b> {highlightMatch(i.input_text, search)}</p>
            {i.summary ? (
              <>
                <p className="mt-2 text-blue-700"><b>Summary:</b> {highlightMatch(i.summary, search)}</p>
                <p className="mt-1">
                  <b>Sentiment:</b>{" "}
                  <span
                    className={
                      i.sentiment === "positive"
                        ? "text-green-600 font-semibold"
                        : i.sentiment === "negative"
                        ? "text-red-600 font-semibold"
                        : "text-gray-600 font-semibold"
                    }
                  >
                    {i.sentiment}
                  </span>
                </p>
              </>
            ) : (
              <p className="mt-2 text-gray-500 italic">⏳ Analyzing...</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
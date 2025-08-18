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
    if (!user) return;
    
    fetchInsights();

    const channel = supabase
      .channel("insights-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "insights" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setInsights((prev) => [payload.new, ...prev]);
          }
          if (payload.eventType === "UPDATE") {
            setInsights((prev) =>
              prev.map((i) => (i.id === payload.new.id ? payload.new : i))
            );
            const s = payload.new.sentiment;
            if (s === "positive") toast.success("🌞 Positive feedback detected!");
            else if (s === "negative") toast.error("⚠️ Negative feedback detected!");
            else toast("😐 Neutral feedback logged", { description: "No strong sentiment." });
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  async function fetchInsights() {
    if (!user) return;
    
    const { data } = await supabase
      .from("insights")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setInsights(data || []);
  }

  async function generateInsight() {
    if (!user) {
      toast.error("Please log in to generate insights");
      return;
    }
    
    if (!input.trim()) {
      toast.error("Please enter some text to analyze");
      return;
    }

    setLoading(true);

    try {
      // Optimistic insert with placeholder summary/sentiment
      const { data: newRow, error: insertError } = await supabase
        .from("insights")
        .insert([
          { user_id: user.id, input_text: input, summary: null, sentiment: null }
        ])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Call edge function to generate insight
      const response = await fetch("/functions/v1/insightsAnalysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          data: input
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate insight");
      }

      const { result } = await response.json();
      
      // Update the insight with the AI results
      await supabase
        .from("insights")
        .update({ 
          summary: result.summary, 
          sentiment: result.sentiment 
        })
        .eq("id", newRow.id)
        .eq("user_id", user.id);

      setInput("");
      toast.info("⏳ Processing your insight...");
    } catch (error) {
      console.error("Error generating insight:", error);
      toast.error("Failed to generate insight. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
        placeholder="Paste feedback or text..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        onClick={generateInsight}
        disabled={loading}
        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg"
      >
        {loading ? "Processing..." : "Generate Insight"}
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
import { serve } from "https://deno.land/std@0.155.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { insights_ids, user_id, title, description, insights_data } =
      await req.json();

    if (!insights_ids || !Array.isArray(insights_ids) || insights_ids.length === 0) {
      throw new Error("No insights provided for report generation");
    }
    if (!user_id) {
      throw new Error("User ID is required");
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const reportData = {
      user_id,
      title: title || `AI Report - ${new Date().toLocaleDateString()}`,
      description: description ||
        `Generated report based on ${insights_ids.length} insights`,
      insights_ids,
      generated_at: new Date().toISOString(),
      status: "processing",
    };

    const reportId = Date.now().toString();

    const insightsData = insights_data || [];

    // === Step 1: Pre-process Sentiment Breakdown ===
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    for (const i of insightsData) {
      if (i.sentiment === "positive") sentimentCounts.positive++;
      else if (i.sentiment === "negative") sentimentCounts.negative++;
      else sentimentCounts.neutral++;
    }
    const total = insightsData.length || 1;
    const sentimentBreakdown = {
      positive: Math.round((sentimentCounts.positive / total) * 100),
      negative: Math.round((sentimentCounts.negative / total) * 100),
      neutral: Math.round((sentimentCounts.neutral / total) * 100),
    };

    // === Step 2: Aggregate Themes ===
    const allThemes = insightsData.flatMap((i) => i.key_themes || []);
    const topThemes = [...new Set(allThemes)].slice(0, 10);

    // === Step 3: Create grounded Gemini prompt ===
    const prompt = `
You are a senior business analyst. Generate a **professional, executive-level business report** based only on the provided insights and stats. 
Do NOT invent sentiment percentages — use the provided breakdown.

User Insights Data:
${JSON.stringify(insightsData, null, 2)}

Pre-aggregated Stats:
Sentiment Breakdown = ${JSON.stringify(sentimentBreakdown)}
Top Themes = ${JSON.stringify(topThemes)}

Instructions:
- Write a concise, professional report structured as JSON:
{
  "executive_summary": "...",
  "key_insights": [...],
  "trends": [...],
  "recommended_actions": [...],
  "sentiment_breakdown": ${JSON.stringify(sentimentBreakdown)},
  "top_themes": ${JSON.stringify(topThemes)}
}
- "executive_summary" should be 2–10 sentences, focused on user business context.
- "key_insights", "trends", "recommended_actions" must be specific and derived only from the user’s actual insights.
- Stay grounded in the provided data.
`;

    // === Step 4: Call Gemini ===
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            topK: 50,
            topP: 0.9,
            maxOutputTokens: 1200,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const geminiData = await response.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    let parsedContent;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else throw new Error("No JSON found in Gemini response");
    } catch {
      parsedContent = {
        executive_summary: "Report generated, but fallback mode was used.",
        key_insights: [],
        trends: [],
        recommended_actions: [],
        sentiment_breakdown: sentimentBreakdown,
        top_themes: topThemes,
      };
    }

    const completedReport = {
      ...reportData,
      id: reportId,
      status: "completed",
      content: parsedContent,
    };

    return new Response(
      JSON.stringify({
        success: true,
        report: completedReport,
        message: "Report generated successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Error in generateReport:", err);
    return new Response(
      JSON.stringify({ error: err.message, success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

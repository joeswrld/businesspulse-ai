import { serve } from "https://deno.land/std@0.155.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { insights_ids, user_id, title, description, insights_data, sentimentBreakdown, topThemes } = await req.json();

    // --- Validate input ---
    if (!user_id) throw new Error("User ID is required");
    if (!insights_ids || !Array.isArray(insights_ids) || insights_ids.length === 0) {
      throw new Error("No insights IDs provided");
    }
    if (!insights_data || !Array.isArray(insights_data) || insights_data.length === 0) {
      throw new Error("No insights data provided");
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // --- Prepare report metadata ---
    const reportId = Date.now().toString();
    const reportData = {
      id: reportId,
      user_id,
      title: title || `AI Report - ${new Date().toLocaleDateString()}`,
      description: description || `Generated report based on ${insights_ids.length} insights`,
      insights_ids,
      generated_at: new Date().toISOString(),
      status: 'processing'
    };

    // --- Build Gemini prompt ---
    const prompt = `
You are a senior business analyst. Generate a professional, executive-level business report strictly based on the provided insights and stats.
Do NOT invent sentiment percentages — use the provided breakdown.

User Insights Data:
${JSON.stringify(insights_data, null, 2)}

Pre-aggregated Stats:
Sentiment Breakdown = ${JSON.stringify(sentimentBreakdown)}
Top Themes = ${JSON.stringify(topThemes)}

Instructions:
- Return a JSON object with this structure:
{
  "executive_summary": "...",
  "key_insights": [...],
  "trends": [...],
  "recommended_actions": [...],
  "sentiment_breakdown": ${JSON.stringify(sentimentBreakdown)},
  "top_themes": ${JSON.stringify(topThemes)}
}
- Executive summary: 2–10 sentences, strategic and grounded in data.
- Key insights, trends, and recommended actions must be derived ONLY from the insights data.
- Stay strictly grounded in the provided data.
`;

    // --- Call Gemini API ---
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, topK: 50, topP: 0.9, maxOutputTokens: 1200 }
        })
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API request failed: ${response.status} - ${text}`);
    }

    const geminiData = await response.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    // --- Parse Gemini response safely ---
    let parsedContent;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in Gemini response");
      }
    } catch (parseError) {
      console.error("JSON parsing error:", parseError, "Raw Text:", rawText);
      parsedContent = {
        executive_summary: "Report generated with fallback content; review insights for details.",
        key_insights: insights_data.map(i => i.summary || "No summary available"),
        trends: [],
        recommended_actions: [],
        sentiment_breakdown: sentimentBreakdown,
        top_themes: topThemes
      };
    }

    // --- Return completed report ---
    const completedReport = {
      ...reportData,
      status: 'completed',
      content: parsedContent
    };

    return new Response(JSON.stringify({ success: true, report: completedReport }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error in generateReport:', err);
    return new Response(JSON.stringify({ error: err.message, success: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

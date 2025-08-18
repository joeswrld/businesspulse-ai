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
    const { data } = await req.json();
    if (!data) throw new Error("No input data provided");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // ChatGPT-style, professional prompt with few-shot examples
    const prompt = `
You are a senior product analyst and insights expert. Analyze user feedback carefully.

Step 1: Identify key themes.
Step 2: Determine overall sentiment.
Step 3: Suggest 2-10 actionable steps.
Step 4: Provide a concise 1-3 sentence summary.

Strictly return JSON only, with this structure:
{
  "summary": "Concise summary of main points",
  "sentiment": "positive | negative | neutral",
  "key_themes": ["theme1", "theme2", ...],
  "suggested_actions": ["action1", "action2", ...]
}

Example 1:
Feedback: "I love the dashboard, but the loading is slow."
JSON:
{
  "summary": "Users appreciate the dashboard design but notice slow loading times.",
  "sentiment": "neutral",
  "key_themes": ["dashboard design", "loading speed"],
  "suggested_actions": ["Optimize dashboard performance", "Monitor loading times"]
}

Example 2:
Feedback: "Customer support was unhelpful and delayed my issue resolution."
JSON:
{
  "summary": "Users are frustrated with customer support delays and unhelpfulness.",
  "sentiment": "negative",
  "key_themes": ["customer support", "response time"],
  "suggested_actions": ["Improve support training", "Reduce response times"]
}

Now analyze this feedback:
"${data}"
`;

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
          generationConfig: {
            temperature: 0.2,
            topK: 50,
            topP: 0.9,
            maxOutputTokens: 700
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const geminiData = await response.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    // Safe JSON parsing with defaults
    let parsed = {
      summary: "Analysis failed",
      sentiment: "neutral",
      key_themes: [],
      suggested_actions: []
    };

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      parsed.summary ??= "No summary available";
      parsed.sentiment ??= "neutral";
      parsed.key_themes ??= [];
      parsed.suggested_actions ??= [];
    } catch {
      parsed = {
        summary: rawText,
        sentiment: "neutral",
        key_themes: [],
        suggested_actions: []
      };
    }

    return new Response(
      JSON.stringify({ success: true, result: parsed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error in insightsAnalysis:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
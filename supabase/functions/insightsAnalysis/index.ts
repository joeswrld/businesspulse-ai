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

    const prompt = `
    You are a senior business insights analyst. Analyze the following dataset of multiple user feedback entries. 
    Your job is to discover trends, patterns, and actionable insights across the entire dataset.
    
    Steps to follow:
    1. Identify the top recurring themes or issues across all entries (group them into clear categories).
    2. Determine the overall sentiment distribution (count how many are positive, negative, neutral).
    3. Suggest 3–10 high-impact, actionable steps to improve business performance based on trends in the data.
    4. Provide a concise executive summary (2–10 sentences) that captures the key insights and recommendations.
    
    Important rules:
    - Focus only on the provided dataset.
    - Do not invent or assume data.
    - Respond only in valid JSON using this structure:
    {
      "summary": "Executive summary based on aggregated dataset",
      "sentiment_overview": {
        "positive": number,
        "negative": number,
        "neutral": number
      },
      "key_themes": ["theme1", "theme2", ...],
      "suggested_actions": ["action1", "action2", ...]
    }
    
    Now analyze this dataset:
    ${JSON.stringify(data)}
    `
    

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
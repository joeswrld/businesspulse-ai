import { serve } from "https://deno.land/std@0.155.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { data } = await req.json();
    if (!data) throw new Error("No input data provided");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // Professional prompt
    const prompt = `
You are a professional product analyst and insights expert. Carefully analyze the following user feedback:

"${data}"

Respond strictly in JSON with this exact structure:

{
  "summary": "A concise summary highlighting the main points of the feedback",
  "sentiment": "positive | negative | neutral",
  "key_themes": ["theme1", "theme2", ...],
  "suggested_actions": ["action1", "action2", ...]
}

Guidelines:
1. Summary: 1-3 sentences, clear and professional.
2. Sentiment: "positive" for praise, "negative" for complaints, "neutral" for factual statements or mixed feedback.
3. Key Themes: 2-5 short keywords/phrases representing main topics.
4. Suggested Actions: 2-5 actionable steps the product team can take.
5. JSON Only: No text outside JSON.
6. Be objective, concise, and professional.
`;

    // Call Gemini API
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: prompt }] }
          ],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 600
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const geminiData = await response.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    // Parse JSON safely
    let parsed = {
      summary: "Analysis failed",
      sentiment: "neutral",
      key_themes: [],
      suggested_actions: []
    };

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);

      // Ensure all keys exist
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
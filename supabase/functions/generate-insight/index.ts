import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateInsightRequest {
  text: string;
  user_id: string;
  insight_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, user_id, insight_id } = await req.json() as GenerateInsightRequest;

    if (!text || !user_id || !insight_id) {
      throw new Error('Missing required parameters: text, user_id, and insight_id');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize Gemini API
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // === Step: Call Gemini AI for analysis ===
const prompt = `
You are an AI assistant analyzing customer feedback.  

=== FEEDBACK ===
"${text}"

=== OUTPUT FORMAT ===
Return a single JSON object in this exact structure:
{
  "summary": "1–5 sentence concise summary of the feedback",
  "sentiment": "positive" | "negative" | "neutral"
}

=== RULES ===
- "summary" must capture the main point(s) without adding extra opinions.  
- "sentiment" classification:
  * "positive" → praise, satisfaction, or good experiences.  
  * "negative" → complaints, dissatisfaction, or problems.  
  * "neutral" → factual statements, suggestions, or mixed/unclear sentiment.  
- Be strictly objective and base analysis only on the feedback provided.  
- Do NOT include any text outside the JSON object.  
`;

    const geminiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 512,
        }
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    
    let parsed = { summary: "Analysis failed", sentiment: "neutral" };
    try {
      // Extract JSON from the response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback parsing
      parsed = { summary: rawText, sentiment: "neutral" };
    }

    // Update the insight in Supabase
    const { error: updateError } = await supabase
      .from("insights")
      .update({ 
        summary: parsed.summary, 
        sentiment: parsed.sentiment 
      })
      .eq("id", insight_id)
      .eq("user_id", user_id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary: parsed.summary,
        sentiment: parsed.sentiment
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err) {
    console.error('Error in generate-insight:', err);
    return new Response(
      JSON.stringify({ error: err.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
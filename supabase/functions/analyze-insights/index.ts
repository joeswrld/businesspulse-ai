import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Configuration Constants ---
const ANALYSIS_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: {
      type: "STRING",
      description: "A concise 2-paragraph summary of key findings and insights from the user feedback. Focus on patterns, pain points, satisfaction levels, and opportunities for improvement."
    },
    key_themes: {
      type: "ARRAY",
      description: "Three to four recurring feedback topics, user pain points, and positive experiences (max 15 words each).",
      items: {
        type: "STRING"
      }
    },
    suggested_actions: {
      type: "ARRAY",
      description: "Three to four practical improvements that address user feedback (max 15 words each).",
      items: {
        type: "STRING"
      }
    },
    trends: {
      type: "ARRAY",
      description: "Two to three patterns in user sentiment and feedback (max 15 words each).",
      items: {
        type: "STRING"
      }
    },
    performance: {
      type: "OBJECT",
      properties: {
        metrics: {
          type: "ARRAY",
          description: "Two to three key metrics derived from the data (max 15 words each).",
          items: {
            type: "STRING"
          }
        },
        score: {
          type: "NUMBER",
          description: "Overall performance score (0-100) based on feedback sentiment."
        }
      },
      required: [
        "metrics",
        "score"
      ]
    },
    sentiment: {
      type: "OBJECT",
      properties: {
        positive: {
          type: "NUMBER",
          description: "Percentage of positive sentiment (0-100). Sum of all sentiments should be 100."
        },
        negative: {
          type: "NUMBER",
          description: "Percentage of negative sentiment (0-100). Sum of all sentiments should be 100."
        },
        neutral: {
          type: "NUMBER",
          description: "Percentage of neutral sentiment (0-100). Sum of all sentiments should be 100."
        },
        overall: {
          type: "STRING",
          description: "Overall sentiment: 'positive', 'negative', or 'neutral'."
        }
      },
      required: [
        "positive",
        "negative",
        "neutral",
        "overall"
      ]
    }
  },
  required: [
    "summary",
    "key_themes",
    "suggested_actions",
    "trends",
    "performance",
    "sentiment"
  ]
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// --- Enhanced AI Prompt ---
const ANALYSIS_PROMPT_TEMPLATE = (dataString: string, fileType: string) => `Analyze the following raw user feedback data. Each entry may include rating, sentiment, text, and metadata.

Data:
${dataString}

Your task: Generate insights **only from this dataset**. Do not invent or assume information not present.

Return a JSON object following the exact schema provided. Ensure each field is derived directly from the data:

1. **summary**: Two concise paragraphs describing recurring themes, satisfaction levels, pain points, and opportunities. Base this on actual feedback content, not assumptions.

2. **key_themes**: 3–4 recurring feedback topics (≤ 15 words each). Identify patterns from the actual messages, not generic themes.

3. **suggested_actions**: 3–4 practical improvements clearly addressing user pain points mentioned in the feedback (≤ 15 words each).

4. **trends**: 2–3 patterns in sentiment or behavior based on ratings and message content (≤ 15 words each).

5. **performance**:
   - **metrics**: 2–3 quantifiable metrics calculated from the data (e.g., "Average rating 3.8/5", "45% mentioned bugs", "Response time complaints 25%").
   - **score**: Overall performance score (0–100) based strictly on aggregated sentiment and ratings.

6. **sentiment**:
   - Calculate exact percentages of positive, negative, and neutral feedback based on ratings and message tone (sum = 100).
   - Positive: ratings 4-5 or clearly positive messages
   - Negative: ratings 1-2 or clearly negative messages
   - Neutral: rating 3 or neutral-toned messages
   - Label overall sentiment as "positive", "negative", or "neutral" based on the majority.

Rules:
- Base all insights on the provided data only.
- If data is insufficient, reflect that in the output instead of fabricating information.
- Use actual numbers and percentages from the dataset.
- Keep the tone professional and actionable.
- Ensure valid JSON output strictly matching the schema.
- If no ratings are present, base sentiment purely on message tone analysis.`;

// --- Utility Function for Resilient Fetching ---
async function fetchWithExponentialBackoff(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
    
    try {
      const response = await fetch(url, options);
      
      if (response.ok || (response.status >= 400 && response.status !== 429)) {
        return response;
      }
      
      console.warn(`[Attempt ${attempt}/${maxRetries}] API call failed with status ${response.status}. Retrying in ${delay.toFixed(0)}ms...`);
    } catch (error) {
      console.warn(`[Attempt ${attempt}/${maxRetries}] API call failed with network error: ${error.message}. Retrying in ${delay.toFixed(0)}ms...`);
    }
    
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  console.error(`[Attempt ${attempt}/${maxRetries}] Max retries reached. Final API call failed.`);
  return fetch(url, options);
}

// --- Main Handler ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Analyze Insights function called');

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header');
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables (URL/KEY) are not set.');
    }

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Invalid token:', authError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid token'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ User authenticated:', user.id);

    const { data, userId, fileType } = await req.json();

    if (!data || !userId) {
      console.error('❌ Missing required fields');
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (user.id !== userId) {
      console.error('❌ User ID mismatch');
      return new Response(JSON.stringify({
        success: false,
        error: 'Forbidden'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📊 Analysis request:', {
      userId,
      fileType,
      dataLength: Array.isArray(data) ? data.length : typeof data === 'string' ? data.length : JSON.stringify(data).length
    });

    // Check usage limits
    const { data: usageData, error: usageError } = await serviceSupabase
      .from('usage_tracking')
      .select('insights_count')
      .eq('user_id', userId)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('⚠️ Error checking usage:', usageError);
    }

    const { data: subscriptionData } = await serviceSupabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    let userPlan = 'free';
    if (subscriptionData) {
      if (subscriptionData.status === 'active') {
        userPlan = subscriptionData.plan_name || subscriptionData.plan_type || 'pro';
      } else if (subscriptionData.status === 'trialing') {
        userPlan = 'free';
      }
    }

    console.log('👤 User plan:', userPlan);

    const planLimits: Record<string, number> = {
      free: 5,
      pro: 50,
      business: -1,
      enterprise: -1
    };

    const validPlan = planLimits[userPlan] !== undefined ? userPlan : 'free';
    const currentUsage = usageData?.insights_count || 0;
    const limit = planLimits[validPlan];

    if (limit !== -1 && currentUsage >= limit) {
      console.warn('⚠️ Usage limit reached');
      return new Response(JSON.stringify({
        success: false,
        error: `Usage limit reached. Current: ${currentUsage}, Limit: ${limit}. Please upgrade your plan.`
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Prepare data for Gemini AI
    let dataString = '';
    if (typeof data === 'object') {
      dataString = JSON.stringify(data, null, 2);
    } else {
      dataString = String(data);
    }

    const prompt = ANALYSIS_PROMPT_TEMPLATE(dataString, fileType || 'feedback');

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found in environment');
      return new Response(JSON.stringify({
        success: false,
        error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in your Supabase environment variables.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🤖 Calling Gemini API with enhanced prompt...');
    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

    const response = await fetchWithExponentialBackoff(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: ANALYSIS_RESPONSE_SCHEMA
        }
      })
    });

    console.log('📡 Gemini API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Gemini API request failed';
      
      if (response.status === 400) {
        errorMessage = 'Bad request to Gemini API. Please check your request format.';
      } else if (response.status === 403) {
        errorMessage = 'Gemini API key is invalid or restricted. Please check your API key permissions.';
      } else if (response.status === 429) {
        errorMessage = 'Gemini API rate limit exceeded. Please try again later.';
      }

      return new Response(JSON.stringify({
        success: false,
        error: `${errorMessage} (Status: ${response.status})`,
        details: errorText.substring(0, 500)
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const geminiData = await response.json();
    console.log('✅ Gemini API response received');

    const candidate = geminiData.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    const finishReason = candidate?.finishReason;

    if (!text) {
      console.error('❌ No text generated by Gemini');
      let errorMessage = 'No analysis generated by AI.';
      let status = 500;
      
      if (finishReason) {
        errorMessage = `AI generation failed: Reason - ${finishReason}.`;
        status = 400;
        
        if (finishReason === 'SAFETY') {
          errorMessage += ' The prompt or input data violated policy filters. Please adjust your input.';
        } else if (finishReason === 'RECITATION') {
          errorMessage += ' The model declined to answer to prevent reciting copyrighted material.';
        } else if (finishReason === 'MAX_TOKENS') {
          errorMessage += ' The analysis was too long. Please try with fewer feedback entries.';
        }
      }

      return new Response(JSON.stringify({
        success: false,
        error: errorMessage,
        details: finishReason
      }), {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let analysis;
    try {
      const analysisText = text.trim();
      analysis = JSON.parse(analysisText);
      
      if (!analysis.summary || !analysis.key_themes || !analysis.suggested_actions || 
          !analysis.performance || !analysis.sentiment) {
        throw new Error('Invalid response structure from AI: Missing required top-level fields.');
      }

      console.log('✅ Successfully parsed AI analysis');

      // Normalize sentiment percentages
      const totalSentiment = analysis.sentiment.positive + analysis.sentiment.negative + analysis.sentiment.neutral;
      if (Math.abs(totalSentiment - 100) > 1) {
        const factor = 100 / totalSentiment;
        analysis.sentiment.positive = Math.round(analysis.sentiment.positive * factor);
        analysis.sentiment.negative = Math.round(analysis.sentiment.negative * factor);
        analysis.sentiment.neutral = 100 - analysis.sentiment.positive - analysis.sentiment.negative;
        console.log('📊 Normalized sentiment percentages');
      }

      analysis.performance.score = Math.max(0, Math.min(100, Math.round(analysis.performance.score)));
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to parse AI analysis response. ${parseError instanceof Error ? parseError.message : 'The AI did not return a parsable JSON structure.'}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Increment usage count
    try {
      const { error: incrementError } = await serviceSupabase.rpc('increment_usage', {
        p_user_id: userId,
        p_action: 'insights'
      });
      
      if (incrementError) {
        console.error('⚠️ Error incrementing usage:', incrementError);
      } else {
        console.log('📈 Usage incremented successfully');
      }
    } catch (usageErr) {
      console.error('⚠️ Usage tracking error:', usageErr);
    }

    console.log('🎉 Analysis completed successfully');

    return new Response(JSON.stringify({
      success: true,
      analysis
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

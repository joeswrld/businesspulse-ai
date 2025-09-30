import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// --- Configuration Constants ---
// Define the full JSON schema for structured output to ensure reliability
const ANALYSIS_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: {
      type: "STRING",
      description: "A comprehensive 2-3 paragraph summary of the key findings and insights from the user feedback. Focus on patterns, pain points, satisfaction levels, and opportunities for improvement."
    },
    key_themes: {
      type: "ARRAY",
      description: "Five recurring feedback topics, user pain points, and positive experiences.",
      items: {
        type: "STRING"
      }
    },
    suggested_actions: {
      type: "ARRAY",
      description: "Five practical improvements that address user feedback.",
      items: {
        type: "STRING"
      }
    },
    trends: {
      type: "ARRAY",
      description: "Four highlight patterns in user sentiment and feedback.",
      items: {
        type: "STRING"
      }
    },
    performance: {
      type: "OBJECT",
      properties: {
        metrics: {
          type: "ARRAY",
          description: "Four key metrics derived from the data.",
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
// --- AI Prompt Definition ---
// Simplified prompt—the JSON structure is now defined by the schema (ANALYSIS_RESPONSE_SCHEMA)
const ANALYSIS_PROMPT_TEMPLATE = (dataString, fileType)=>`You are an expert business analyst specializing in customer feedback analysis and user experience insights. Analyze the following user feedback data and provide comprehensive, actionable insights in the required JSON format.

Data to analyze:
${dataString}

Analysis type: ${fileType === 'feedback-analysis' ? 'User Feedback Analysis' : 'General Data Analysis'}

Important guidelines for analysis:
- Summary should focus on user experience insights, common issues, and satisfaction patterns.
- Key themes should identify recurring feedback topics, user pain points, and positive experiences.
- Suggested actions should be practical improvements that address user feedback.
- Trends should highlight patterns in user sentiment and feedback.
- Performance score should be 0-100 based on overall feedback sentiment and actionable insights.
- Sentiment percentages must reflect the proportion of positive, negative, and neutral entries.
- The output MUST strictly follow the requested JSON schema.
`;
// --- Utility Function for Resilient Fetching ---
/**
 * Fetches an API endpoint with exponential backoff for transient errors (5xx and 429 status codes).
 * @param url The API URL.
 * @param options Fetch request options.
 * @param maxRetries The maximum number of retry attempts.
 * @returns The Response object.
 */ async function fetchWithExponentialBackoff(url, options, maxRetries = 3) {
  let attempt = 0;
  while(attempt < maxRetries){
    attempt++;
    const delay = Math.pow(2, attempt) * 100 + Math.random() * 100; // 300ms, 700ms, 1500ms...
    try {
      const response = await fetch(url, options);
      // Successful response or client error (4xx) that shouldn't be retried (except 429)
      if (response.ok || response.status >= 400 && response.status !== 429) {
        return response;
      }
      // Server error (5xx) or Rate Limit (429) - retry
      console.warn(`[Attempt ${attempt}/${maxRetries}] API call failed with status ${response.status}. Retrying in ${delay.toFixed(0)}ms...`);
    } catch (error) {
      // Network error (e.g., Deno.errors.Http or connection loss) - retry
      console.warn(`[Attempt ${attempt}/${maxRetries}] API call failed with network error: ${error.message}. Retrying in ${delay.toFixed(0)}ms...`);
    }
    if (attempt < maxRetries) {
      await new Promise((resolve)=>setTimeout(resolve, delay));
    }
  }
  // Final attempt failed, throw an error or return the last non-ok response
  console.error(`[Attempt ${attempt}/${maxRetries}] Max retries reached. Final API call failed.`);
  // Re-run the last fetch outside the loop to get the final response/error for robust handling downstream
  return fetch(url, options);
}
// --- Main Handler ---
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    console.log('🚀 Analyze Insights function called');
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header');
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const token = authHeader.substring(7);
    // Initialize Supabase Service Role client for system operations (usage tracking)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables (URL/KEY) are not set.');
    }
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
    // Verify the JWT token and get user using the service client
    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser(token);
    if (authError || !user) {
      console.error('❌ Invalid token:', authError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid token'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('✅ User authenticated:', user.id);
    // Parse request body
    const { data, userId, fileType } = await req.json();
    // Validate request body and user ID match
    if (!data || !userId) {
      console.error('❌ Missing required fields');
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (user.id !== userId) {
      console.error('❌ User ID mismatch');
      return new Response(JSON.stringify({
        success: false,
        error: 'Forbidden'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('📊 Analysis request:', {
      userId,
      fileType,
      dataLength: typeof data === 'string' ? data.length : JSON.stringify(data).length
    });
    // Check usage limits using the service client
    const { data: usageData, error: usageError } = await serviceSupabase.from('usage_tracking').select('insights_count').eq('user_id', userId).single();
    if (usageError && usageError.code !== 'PGRST116') {
      console.error('⚠️ Error checking usage:', usageError);
    }
    const { data: subscriptionData } = await serviceSupabase.from('user_subscriptions').select('*').eq('user_id', userId).single();
    let userPlan = 'free';
    if (subscriptionData) {
      if (subscriptionData.status === 'active') {
        userPlan = subscriptionData.plan_name || subscriptionData.plan_type || 'pro';
      } else if (subscriptionData.status === 'trialing') {
        userPlan = 'free';
      }
    }
    console.log('👤 User plan:', userPlan);
    const planLimits = {
      free: 5,
      pro: 50,
      business: -1,
      enterprise: -1
    };
    // Coerce userPlan to a valid key for type safety and defaulting to 'free' if unexpected
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
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Prepare data for Gemini AI
    let dataString = '';
    if (typeof data === 'object') {
      dataString = JSON.stringify(data, null, 2);
    } else {
      dataString = String(data);
    }
    const prompt = ANALYSIS_PROMPT_TEMPLATE(dataString, fileType);
    // Get Gemini API key
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found in environment');
      return new Response(JSON.stringify({
        success: false,
        error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in your Supabase environment variables.'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('🤖 Calling Gemini API...');
    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
    // Use the robust fetch function
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
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
          // *** FIX: Enable Structured Output for reliable JSON response ***
          responseMimeType: "application/json",
          responseSchema: ANALYSIS_RESPONSE_SCHEMA
        }
      })
    });
    console.log('📡 Gemini API response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Gemini API request failed';
      // Enhanced error messages based on status
      if (response.status === 400) {
        errorMessage = 'Bad request to Gemini API. Please check your request format.';
      } else if (response.status === 403) {
        errorMessage = 'Gemini API key is invalid or restricted. Please check your API key permissions.';
      } else if (response.status === 429) {
        errorMessage = 'Gemini API rate limit exceeded even after retries. Please try again later.';
      }
      return new Response(JSON.stringify({
        success: false,
        error: `${errorMessage} (Status: ${response.status})`,
        details: errorText.substring(0, 500)
      }), {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
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
      let status = 500; // Default to internal error
      if (finishReason) {
        errorMessage = `AI generation failed: Reason - ${finishReason}.`;
        status = 400; // Use 400 for content/limit related issues
        if (finishReason === 'SAFETY') {
          errorMessage += ' The prompt or input data violated policy filters. Please adjust your input.';
        } else if (finishReason === 'RECITATION') {
          errorMessage += ' The model declined to answer to prevent reciting copyrighted material.';
        } else if (finishReason === 'MAX_TOKENS') {
          errorMessage += ' The analysis was too long and hit the output token limit (2048).';
        }
      }
      return new Response(JSON.stringify({
        success: false,
        error: errorMessage,
        details: finishReason
      }), {
        status: status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    let analysis;
    try {
      const analysisText = text.trim();
      // *** FIX: Rely on structured output to return clean JSON, simplifying parsing. ***
      analysis = JSON.parse(analysisText);
      // Manual structure validation remains a good failsafe
      if (!analysis.summary || !analysis.key_themes || !analysis.suggested_actions || !analysis.performance || !analysis.sentiment) {
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
      analysis.performance.score = Math.max(0, Math.min(100, analysis.performance.score));
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to parse AI analysis response. ${parseError instanceof Error ? parseError.message : 'The AI did not return a parsable JSON structure.'}`
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Increment usage count using the service client
    try {
      // Assuming 'increment_usage' is a stored procedure in Supabase
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
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

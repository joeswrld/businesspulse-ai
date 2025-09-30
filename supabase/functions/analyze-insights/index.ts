import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
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
    // FIX: Renamed for clarity: Use serviceSupabase for full access tasks (checking/incrementing usage)
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
    // ... (Remaining usage logic and Gemini call logic is correct and remains the same)
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
    const currentUsage = usageData?.insights_count || 0;
    const limit = planLimits[userPlan];
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
    // ... (Prompt definition is correct and omitted for brevity)
    const prompt = `You are an expert business analyst specializing in customer feedback analysis and user experience insights. Analyze the following user feedback data and provide comprehensive, actionable insights.

Data to analyze:
${dataString}

Analysis type: ${fileType === 'feedback-analysis' ? 'User Feedback Analysis' : 'General Data Analysis'}

Please provide a detailed analysis in the following JSON format (return ONLY valid JSON, no markdown code blocks):

{
  "summary": "A comprehensive 2-3 paragraph summary of the key findings and insights from the user feedback. Focus on patterns, pain points, satisfaction levels, and opportunities for improvement.",
  "key_themes": ["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
  "suggested_actions": ["Action 1", "Action 2", "Action 3", "Action 4", "Action 5"],
  "trends": ["Trend 1", "Trend 2", "Trend 3", "Trend 4"],
  "performance": {
    "metrics": ["Metric 1", "Metric 2", "Metric 3", "Metric 4"],
    "score": 85
  },
  "sentiment": {
    "positive": 65,
    "negative": 15,
    "neutral": 20,
    "overall": "positive"
  }
}

Important guidelines:
- Summary should focus on user experience insights, common issues, and satisfaction patterns
- Key themes should identify recurring feedback topics, user pain points, and positive experiences
- Suggested actions should be practical improvements that address user feedback
- Trends should highlight patterns in user sentiment and feedback
- Performance score should be 0-100 based on overall feedback sentiment and actionable insights
- Sentiment percentages must add up to 100
- Overall sentiment should be "positive", "negative", or "neutral"
- Return ONLY the JSON object, no markdown formatting or code blocks

Pay special attention to:
- User pain points and frustrations
- Feature requests and improvement suggestions
- Positive experiences and what users appreciate
- Common patterns across multiple feedback entries
- Urgency and priority of issues mentioned
`;
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
    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    const response = await fetch(geminiUrl, {
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
          maxOutputTokens: 2048
        }
      })
    });
    // ... (Gemini response handling and parsing is correct and omitted for brevity)
    console.log('📡 Gemini API response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      // ... (Error handling logic)
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
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const geminiData = await response.json();
    console.log('✅ Gemini API response received');
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('❌ No text generated by Gemini');
      return new Response(JSON.stringify({
        success: false,
        error: 'No analysis generated by AI'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    let analysis;
    try {
      let cleanedText = text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      analysis = JSON.parse(jsonMatch[0]);
      if (!analysis.summary || !analysis.key_themes || !analysis.suggested_actions || !analysis.performance || !analysis.sentiment) {
        throw new Error('Invalid response structure from AI');
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
        error: 'Failed to parse AI analysis response. The AI did not return valid JSON.',
        rawResponse: text.substring(0, 500)
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

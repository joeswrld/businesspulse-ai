import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzeRequest {
  data: any;
  userId: string;
  fileType: string;
}

interface AnalyzeResponse {
  success: boolean;
  analysis?: {
    summary: string;
    key_themes: string[];
    suggested_actions: string[];
    trends: string[];
    performance: {
      metrics: string[];
      score: number;
    };
    sentiment: {
      positive: number;
      negative: number;
      neutral: number;
      overall: 'positive' | 'negative' | 'neutral';
    };
  };
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Analyze Insights function called');

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.substring(7)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Invalid token:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body
    const { data, userId, fileType }: AnalyzeRequest = await req.json()

    // Validate request body
    if (!data || !userId) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ensure the user can only analyze their own data
    if (user.id !== userId) {
      console.error('❌ User ID mismatch');
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📊 Analysis request:', {
      userId,
      fileType,
      dataLength: typeof data === 'string' ? data.length : JSON.stringify(data).length
    });

    // Check usage limits
    const { data: usageData, error: usageError } = await supabase
      .from('usage_tracking')
      .select('insights_count')
      .eq('user_id', userId)
      .single()

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('⚠️ Error checking usage:', usageError)
      // Continue anyway - don't block on usage tracking errors
    }

    // Get user subscription to check limits
    const { data: subscriptionData } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Determine user's plan
    let userPlan = 'free'
    if (subscriptionData) {
      if (subscriptionData.status === 'active') {
        userPlan = subscriptionData.plan_name || subscriptionData.plan_type || 'pro'
      } else if (subscriptionData.status === 'trialing') {
        userPlan = 'free'
      }
    }

    console.log('👤 User plan:', userPlan);

    // Define plan limits
    const planLimits = {
      free: 5,
      pro: 50,
      business: -1, // unlimited
      enterprise: -1 // unlimited
    }

    const currentUsage = usageData?.insights_count || 0
    const limit = planLimits[userPlan as keyof typeof planLimits]

    if (limit !== -1 && currentUsage >= limit) {
      console.warn('⚠️ Usage limit reached');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Usage limit reached. Current: ${currentUsage}, Limit: ${limit}. Please upgrade your plan.` 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare data for Gemini AI
    let dataString = ''
    if (typeof data === 'object') {
      dataString = JSON.stringify(data, null, 2)
    } else {
      dataString = String(data)
    }
    
    // Log analysis details
    console.log(`🔍 Analysis type: ${fileType}`)
    console.log(`📊 Data length: ${dataString.length} characters`)

    // Create the prompt for Gemini AI
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
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in your Supabase environment variables.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🤖 Calling Gemini API...');

    // FIXED: Use the correct API endpoint and model name
    // Use v1beta API and correct model name: gemini-1.5-pro
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: prompt }] 
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      })
    });

    console.log('📡 Gemini API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      let errorMessage = 'Gemini API request failed';
      if (response.status === 400) {
        errorMessage = 'Bad request to Gemini API. Please check your request format.';
      } else if (response.status === 403) {
        errorMessage = 'Gemini API key is invalid or restricted. Please check your API key permissions.';
      } else if (response.status === 404) {
        errorMessage = 'Gemini API endpoint not found. The model may not be available.';
      } else if (response.status === 429) {
        errorMessage = 'Gemini API rate limit exceeded. Please try again later.';
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `${errorMessage} (Status: ${response.status})`,
          details: errorText.substring(0, 500)
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await response.json();
    console.log('✅ Gemini API response received');

    // Extract generated text
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.error('❌ No text generated by Gemini');
      console.error('Gemini response:', JSON.stringify(geminiData, null, 2));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No analysis generated by AI' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📄 Generated text length:', text.length);

    // Parse the JSON response
    let analysis
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedText = text.trim();
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Extract JSON from the response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('❌ No valid JSON found in response');
        console.error('Raw text:', text.substring(0, 500));
        throw new Error('No valid JSON found in response')
      }
      
      analysis = JSON.parse(jsonMatch[0])
      
      // Validate the response structure
      if (!analysis.summary || !analysis.key_themes || !analysis.suggested_actions || 
          !analysis.trends || !analysis.performance || !analysis.sentiment) {
        console.error('❌ Invalid response structure');
        console.error('Parsed analysis:', analysis);
        throw new Error('Invalid response structure from AI')
      }
      
      console.log('✅ Successfully parsed AI analysis');
      
      // Normalize sentiment percentages to ensure they add up to 100
      const totalSentiment = analysis.sentiment.positive + analysis.sentiment.negative + analysis.sentiment.neutral
      if (Math.abs(totalSentiment - 100) > 1) {
        const factor = 100 / totalSentiment
        analysis.sentiment.positive = Math.round(analysis.sentiment.positive * factor)
        analysis.sentiment.negative = Math.round(analysis.sentiment.negative * factor)
        analysis.sentiment.neutral = 100 - analysis.sentiment.positive - analysis.sentiment.negative
        console.log('📊 Normalized sentiment percentages');
      }
      
      // Ensure performance score is within bounds
      analysis.performance.score = Math.max(0, Math.min(100, analysis.performance.score))
      
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError)
      console.error('Raw response:', text.substring(0, 1000))
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse AI analysis response. The AI did not return valid JSON.',
          rawResponse: text.substring(0, 500)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Increment usage count
    try {
      const { error: incrementError } = await supabase
        .rpc('increment_usage', {
          p_user_id: userId,
          p_action: 'insights'
        })

      if (incrementError) {
        console.error('⚠️ Error incrementing usage:', incrementError)
        // Don't fail the request if usage tracking fails
      } else {
        console.log('📈 Usage incremented successfully');
      }
    } catch (usageErr) {
      console.error('⚠️ Usage tracking error:', usageErr);
      // Continue anyway
    }

    console.log('🎉 Analysis completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        analysis
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

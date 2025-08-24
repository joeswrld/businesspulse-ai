import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.24.1'

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
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { data, userId, fileType }: AnalyzeRequest = await req.json()

    // Validate request body
    if (!data || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ensure the user can only analyze their own data
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check usage limits
    const { data: usageData, error: usageError } = await supabase
      .from('usage_tracking')
      .select('insights_count')
      .eq('user_id', userId)
      .single()

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Error checking usage:', usageError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to check usage limits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
        userPlan = subscriptionData.plan_id || 'pro'
      } else if (subscriptionData.status === 'trialing') {
        userPlan = 'free'
      }
    }

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

    // Create the prompt for Gemini AI
    const prompt = `
You are an expert business analyst and data scientist. Analyze the following data and provide comprehensive insights.

Data to analyze:
${dataString}

File type: ${fileType}

Please provide a detailed analysis in the following JSON format:

{
  "summary": "A comprehensive 2-3 paragraph summary of the key findings and insights from the data",
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

Guidelines:
- Summary should be insightful and actionable
- Key themes should identify the main patterns or topics
- Suggested actions should be practical and implementable
- Trends should highlight directional changes or patterns
- Performance metrics should be relevant to the data type
- Performance score should be 0-100 based on overall data quality and insights
- Sentiment should be calculated based on the tone and content of the data
- Ensure all percentages in sentiment add up to 100
- Overall sentiment should be "positive", "negative", or "neutral"

Return only valid JSON without any additional text or formatting.
`

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!)

    // Call Gemini AI
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse the JSON response
    let analysis
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response')
      }
      
      analysis = JSON.parse(jsonMatch[0])
      
      // Validate the response structure
      if (!analysis.summary || !analysis.key_themes || !analysis.suggested_actions || 
          !analysis.trends || !analysis.performance || !analysis.sentiment) {
        throw new Error('Invalid response structure from AI')
      }
      
      // Ensure sentiment percentages add up to 100
      const totalSentiment = analysis.sentiment.positive + analysis.sentiment.negative + analysis.sentiment.neutral
      if (Math.abs(totalSentiment - 100) > 1) {
        // Normalize to 100%
        const factor = 100 / totalSentiment
        analysis.sentiment.positive = Math.round(analysis.sentiment.positive * factor)
        analysis.sentiment.negative = Math.round(analysis.sentiment.negative * factor)
        analysis.sentiment.neutral = 100 - analysis.sentiment.positive - analysis.sentiment.negative
      }
      
      // Ensure performance score is within bounds
      analysis.performance.score = Math.max(0, Math.min(100, analysis.performance.score))
      
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      console.error('Raw response:', text)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse AI analysis response' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Increment usage count
    const { error: incrementError } = await supabase
      .rpc('increment_usage', {
        p_user_id: userId,
        p_action: 'insights'
      })

    if (incrementError) {
      console.error('Error incrementing usage:', incrementError)
      // Don't fail the request if usage tracking fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Analysis error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
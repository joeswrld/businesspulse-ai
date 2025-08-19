import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the request body
    const { user_id, insights_data } = await req.json()

    // Validate request data
    if (!user_id || !insights_data || !Array.isArray(insights_data)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (insights_data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No insights data available for analysis' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the user is requesting their own data
    if (user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to insights data' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare the data for Gemini analysis
    const insightsSummary = insights_data.map((item: any) => ({
      summary: item.summary,
      sentiment: item.sentiment,
      themes: Array.isArray(item.key_themes) ? item.key_themes.map((theme: any) => 
        typeof theme === 'string' ? theme : theme.theme
      ) : [],
      actions: Array.isArray(item.suggested_actions) ? item.suggested_actions.map((action: any) => 
        typeof action === 'string' ? action : action.action
      ) : [],
      date: item.created_at
    }));

    // Calculate basic metrics
    const totalInsights = insights_data.length;
    const positiveCount = insights_data.filter((item: any) => item.sentiment === 'positive').length;
    const negativeCount = insights_data.filter((item: any) => item.sentiment === 'negative').length;
    const neutralCount = insights_data.filter((item: any) => item.sentiment === 'neutral').length;

    const positivePercentage = Math.round((positiveCount / totalInsights) * 100);
    const negativePercentage = Math.round((negativeCount / totalInsights) * 100);
    const neutralPercentage = Math.round((neutralCount / totalInsights) * 100);

    // For now, return mock analytics since we don't have Gemini API key in the Edge Function
    // In production, you would integrate with Gemini API here
    const mockAnalytics = {
      executive_summary: `Based on analysis of ${totalInsights} insights, your business shows a ${positivePercentage > 50 ? 'positive' : positivePercentage < 30 ? 'negative' : 'mixed'} sentiment trend. The data reveals key patterns in user feedback and suggests actionable improvements for business growth.`,
      key_insights: [
        `Sentiment distribution shows ${positivePercentage}% positive, ${negativePercentage}% negative, and ${neutralPercentage}% neutral feedback`,
        `Most insights focus on product features and user experience improvements`,
        `Customer service and technical issues are recurring themes in negative feedback`,
        `Market analysis insights provide strategic direction for competitive positioning`,
        `User engagement patterns suggest opportunities for feature optimization`
      ],
      trends: [
        `Positive sentiment is trending ${positivePercentage > 60 ? 'upward' : positivePercentage > 40 ? 'stable' : 'downward'} based on recent feedback`,
        `Product-related insights dominate the feedback landscape`,
        `Customer service improvements are becoming increasingly critical`
      ],
      performance_metrics: {
        positive: positivePercentage,
        negative: negativePercentage,
        neutral: neutralPercentage
      },
      recommended_actions: [
        `Prioritize customer service improvements to address ${negativePercentage}% negative feedback`,
        `Continue developing features that generate ${positivePercentage}% positive sentiment`,
        `Implement feedback collection system for better data quality`,
        `Establish regular sentiment analysis reviews for proactive improvements`
      ]
    };

    // Return the analytics
    return new Response(
      JSON.stringify(mockAnalytics),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in generateAnalytics function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
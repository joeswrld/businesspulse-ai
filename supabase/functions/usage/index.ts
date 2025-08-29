import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Plan limits configuration
const PLAN_LIMITS = {
  free: {
    feedback: 50,
    analytics: 5,
    reports: 2,
    insights: 5,
    teams: 1
  },
  pro: {
    feedback: 300,
    analytics: 100,
    reports: 20,
    insights: 50,
    teams: 5
  },
  business: {
    feedback: -1, // unlimited
    analytics: -1,
    reports: -1,
    insights: -1,
    teams: -1
  },
  enterprise: {
    feedback: -1, // unlimited
    analytics: -1,
    reports: -1,
    insights: -1,
    teams: -1
  }
};

interface UsageRequest {
  action: 'feedback' | 'analytics' | 'reports' | 'insights' | 'teams';
}

interface UsageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Determine user's plan from subscription data
 */
function getUserPlan(subscription: any): 'free' | 'pro' | 'business' | 'enterprise' {
  if (!subscription) return 'free';
  
  const planName = subscription.plan_name?.toLowerCase() || subscription.plan_type?.toLowerCase() || '';
  
  if (planName.includes('enterprise')) return 'enterprise';
  if (planName.includes('business')) return 'business';
  if (planName.includes('pro') || planName.includes('premium')) return 'pro';
  
  return 'free';
}

/**
 * Check if user can use a specific feature
 */
function checkUsageLimit(
  feature: string,
  currentUsage: number,
  plan: 'free' | 'pro' | 'business' | 'enterprise'
): boolean {
  const limit = PLAN_LIMITS[plan][feature as keyof typeof PLAN_LIMITS[typeof plan]];
  return limit === -1 || currentUsage < limit;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.log(`[${new Date().toISOString()}] Authentication failed:`, authError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const requestBody: UsageRequest = await req.json()
    
    if (!requestBody.action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing action parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate action
    const validActions = ['feedback', 'analytics', 'reports', 'insights', 'teams']
    if (!validActions.includes(requestBody.action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[${new Date().toISOString()}] Processing usage increment for user ${user.id}, action: ${requestBody.action}`)

    // Get current usage and subscription data
    const [usageResult, subscriptionResult] = await Promise.all([
      supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()
    ])

    // Check if usage data exists
    if (usageResult.error && usageResult.error.code !== 'PGRST116') {
      console.log(`[${new Date().toISOString()}] Error fetching usage data:`, usageResult.error)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch usage data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get current usage count
    const currentUsage = usageResult.data?.[`${requestBody.action}_count`] || 0
    
    // Get user's plan
    const plan = getUserPlan(subscriptionResult.data)
    
    // Check usage limit
    if (!checkUsageLimit(requestBody.action, currentUsage, plan)) {
      const limit = PLAN_LIMITS[plan][requestBody.action as keyof typeof PLAN_LIMITS[typeof plan]]
      console.log(`[${new Date().toISOString()}] Usage limit reached for user ${user.id}, action: ${requestBody.action}, current: ${currentUsage}, limit: ${limit}`)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Usage limit reached for ${requestBody.action}. Current: ${currentUsage}, Limit: ${limit}. Please upgrade your plan to continue.` 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Increment usage
    const { data: usageData, error: dbError } = await supabase
      .rpc('increment_usage', {
        p_user_id: user.id,
        p_action: requestBody.action
      })

    if (dbError) {
      console.log(`[${new Date().toISOString()}] Database error:`, dbError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to increment usage' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[${new Date().toISOString()}] Usage incremented successfully for user ${user.id}, action: ${requestBody.action}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: usageData,
        message: 'Usage tracked successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unexpected error:`, error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
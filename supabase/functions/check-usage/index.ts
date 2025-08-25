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

interface CheckUsageRequest {
  project_id: string;
  feature: 'feedback' | 'analytics' | 'reports' | 'insights' | 'teams';
}

interface CheckUsageResponse {
  success: boolean;
  canUse: boolean;
  currentUsage: number;
  limit: number;
  plan: string;
  remaining: number;
  isUnlimited: boolean;
  error?: string;
}

/**
 * Determine user's plan from subscription data
 */
function getUserPlan(subscription: any): 'free' | 'pro' | 'business' | 'enterprise' {
  if (!subscription) return 'free';
  
  const planId = subscription.plan_id?.toLowerCase() || '';
  
  if (planId.includes('enterprise')) return 'enterprise';
  if (planId.includes('business')) return 'business';
  if (planId.includes('pro') || planId.includes('premium')) return 'pro';
  
  return 'free';
}

/**
 * Check if user can use a specific feature
 */
function checkUsageLimit(
  feature: string,
  currentUsage: number,
  plan: 'free' | 'pro' | 'business' | 'enterprise'
): { canUse: boolean; remaining: number; isUnlimited: boolean } {
  const limit = PLAN_LIMITS[plan][feature as keyof typeof PLAN_LIMITS[typeof plan]];
  const isUnlimited = limit === -1;
  const canUse = isUnlimited || currentUsage < limit;
  const remaining = isUnlimited ? -1 : Math.max(0, limit - currentUsage);

  return { canUse, remaining, isUnlimited };
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
    const { project_id, feature }: CheckUsageRequest = await req.json()

    if (!project_id || !feature) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: project_id and feature' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user ID from project_id
    const { data: projectSettings, error: projectError } = await supabase
      .from('feedback_settings')
      .select('user_id')
      .eq('project_id', project_id)
      .single()

    if (projectError || !projectSettings) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Project not found or invalid project_id' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userId = projectSettings.user_id

    // Get user's subscription data
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subscriptionError)
    }

    // Determine plan
    const plan = getUserPlan(subscription)

    // Determine rolling window in days based on plan
    const windowDays = plan === 'free' ? 8 : (plan === 'pro' ? 30 : (plan === 'business' ? 30 : -1))

    // If unlimited, short-circuit success
    if (PLAN_LIMITS[plan][feature as keyof typeof PLAN_LIMITS[typeof plan]] === -1) {
      const response: CheckUsageResponse = {
        success: true,
        canUse: true,
        currentUsage: 0,
        limit: -1,
        plan,
        remaining: -1,
        isUnlimited: true
      }
      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Count feedback entries for this project in the rolling window
    let currentUsage = 0
    if (feature === 'feedback') {
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - windowDays)
      const { count, error: countError } = await supabase
        .from('feedbacks')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project_id)
        .gte('timestamp', fromDate.toISOString())

      if (countError) {
        console.error('Error counting feedbacks:', countError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to count feedback entries' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      currentUsage = count || 0
    } else {
      // For non-feedback features, fall back to usage_tracking if present
      const { data: usageData, error: usageError } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (usageError && usageError.code !== 'PGRST116') {
        console.error('Error fetching usage data:', usageError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch usage data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      currentUsage = usageData ? usageData[`${feature}_count` as keyof typeof usageData] as number : 0
    }

    const { canUse, remaining, isUnlimited } = checkUsageLimit(feature, currentUsage, plan)
    const limit = PLAN_LIMITS[plan][feature as keyof typeof PLAN_LIMITS[typeof plan]]

    const response: CheckUsageResponse = {
      success: true,
      canUse,
      currentUsage,
      limit,
      plan,
      remaining,
      isUnlimited
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in check-usage function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
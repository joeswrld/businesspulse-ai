import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UsageRequest {
  user_id: string;
  resource_type: 'ai_insights' | 'data_sources' | 'team_members' | 'ai_reports' | 'business_analytics';
  count?: number;
  action?: 'increment' | 'check' | 'get';
}

interface UsageResponse {
  success: boolean;
  can_perform: boolean;
  current_usage: {
    ai_insights_used: number;
    data_sources_used: number;
    team_members_used: number;
    ai_reports_used: number;
    business_analytics_used: number;
  };
  limits: {
    ai_insights_limit: number;
    data_sources_limit: number;
    team_members_limit: number;
    ai_reports_limit: number;
    business_analytics_limit: number;
  };
  remaining: {
    ai_insights: number;
    data_sources: number;
    team_members: number;
    ai_reports: number;
    business_analytics: number;
  };
  message?: string;
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
        JSON.stringify({ error: 'Unauthorized - Please log in to continue' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the request body
    const { user_id, resource_type, count = 1, action = 'check' }: UsageRequest = await req.json()

    // Validate request data
    if (!user_id || !resource_type) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data - Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the user is requesting their own data
    if (user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to usage data - Security violation detected' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let response: UsageResponse;

    if (action === 'increment') {
      // Increment usage using the database function
      const { data: incrementResult, error: incrementError } = await supabaseClient
        .rpc('increment_usage', {
          user_uuid: user_id,
          resource_type: resource_type,
          count: count
        });

      if (incrementError) {
        console.error('Error incrementing usage:', incrementError);
        return new Response(
          JSON.stringify({ error: 'Failed to increment usage', details: incrementError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get updated usage data
      const { data: usageData, error: usageError } = await supabaseClient
        .rpc('get_user_usage', { user_uuid: user_id });

      if (usageError) {
        console.error('Error getting usage data:', usageError);
        return new Response(
          JSON.stringify({ error: 'Failed to get usage data', details: usageError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const currentUsage = usageData?.[0] || {
        ai_insights_used: 0,
        data_sources_used: 0,
        team_members_used: 1,
        ai_reports_used: 0,
        business_analytics_used: 0
      };

      // Get user's plan limits
      const { data: subscriptionData, error: subError } = await supabaseClient
        .from('user_subscriptions')
        .select('plan_name')
        .eq('user_id', user_id)
        .in('status', ['active', 'trialing'])
        .single();

      const planName = subscriptionData?.plan_name || 'free_trial';

      const { data: limitsData, error: limitsError } = await supabaseClient
        .from('usage_limits')
        .select('*')
        .eq('plan_name', planName)
        .single();

      if (limitsError) {
        console.error('Error getting limits:', limitsError);
        return new Response(
          JSON.stringify({ error: 'Failed to get usage limits', details: limitsError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const limits = limitsData || {
        ai_insights_limit: 20,
        data_sources_limit: 1,
        team_members_limit: 1,
        ai_reports_limit: 2,
        business_analytics_limit: 1
      };

      response = {
        success: true,
        can_perform: incrementResult,
        current_usage: currentUsage,
        limits: limits,
        remaining: {
          ai_insights: limits.ai_insights_limit === -1 ? -1 : Math.max(0, limits.ai_insights_limit - currentUsage.ai_insights_used),
          data_sources: limits.data_sources_limit === -1 ? -1 : Math.max(0, limits.data_sources_limit - currentUsage.data_sources_used),
          team_members: limits.team_members_limit === -1 ? -1 : Math.max(0, limits.team_members_limit - currentUsage.team_members_used),
          ai_reports: limits.ai_reports_limit === -1 ? -1 : Math.max(0, limits.ai_reports_limit - currentUsage.ai_reports_used),
          business_analytics: limits.business_analytics_limit === -1 ? -1 : Math.max(0, limits.business_analytics_limit - currentUsage.business_analytics_used)
        },
        message: incrementResult ? 'Usage incremented successfully' : 'Usage limit exceeded'
      };

    } else if (action === 'check') {
      // Check if user can perform action
      const { data: canPerformResult, error: checkError } = await supabaseClient
        .rpc('can_perform_action', {
          user_uuid: user_id,
          resource_type: resource_type,
          required_count: count
        });

      if (checkError) {
        console.error('Error checking usage:', checkError);
        return new Response(
          JSON.stringify({ error: 'Failed to check usage', details: checkError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get current usage data
      const { data: usageData, error: usageError } = await supabaseClient
        .rpc('get_user_usage', { user_uuid: user_id });

      if (usageError) {
        console.error('Error getting usage data:', usageError);
        return new Response(
          JSON.stringify({ error: 'Failed to get usage data', details: usageError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const currentUsage = usageData?.[0] || {
        ai_insights_used: 0,
        data_sources_used: 0,
        team_members_used: 1,
        ai_reports_used: 0,
        business_analytics_used: 0
      };

      // Get user's plan limits
      const { data: subscriptionData, error: subError } = await supabaseClient
        .from('user_subscriptions')
        .select('plan_name')
        .eq('user_id', user_id)
        .in('status', ['active', 'trialing'])
        .single();

      const planName = subscriptionData?.plan_name || 'free_trial';

      const { data: limitsData, error: limitsError } = await supabaseClient
        .from('usage_limits')
        .select('*')
        .eq('plan_name', planName)
        .single();

      if (limitsError) {
        console.error('Error getting limits:', limitsError);
        return new Response(
          JSON.stringify({ error: 'Failed to get usage limits', details: limitsError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const limits = limitsData || {
        ai_insights_limit: 20,
        data_sources_limit: 1,
        team_members_limit: 1,
        ai_reports_limit: 2,
        business_analytics_limit: 1
      };

      response = {
        success: true,
        can_perform: canPerformResult,
        current_usage: currentUsage,
        limits: limits,
        remaining: {
          ai_insights: limits.ai_insights_limit === -1 ? -1 : Math.max(0, limits.ai_insights_limit - currentUsage.ai_insights_used),
          data_sources: limits.data_sources_limit === -1 ? -1 : Math.max(0, limits.data_sources_limit - currentUsage.data_sources_used),
          team_members: limits.team_members_limit === -1 ? -1 : Math.max(0, limits.team_members_limit - currentUsage.team_members_used),
          ai_reports: limits.ai_reports_limit === -1 ? -1 : Math.max(0, limits.ai_reports_limit - currentUsage.ai_reports_used),
          business_analytics: limits.business_analytics_limit === -1 ? -1 : Math.max(0, limits.business_analytics_limit - currentUsage.business_analytics_used)
        },
        message: canPerformResult ? 'Action allowed' : 'Action would exceed usage limits'
      };

    } else if (action === 'get') {
      // Get current usage data
      const { data: usageData, error: usageError } = await supabaseClient
        .rpc('get_user_usage', { user_uuid: user_id });

      if (usageError) {
        console.error('Error getting usage data:', usageError);
        return new Response(
          JSON.stringify({ error: 'Failed to get usage data', details: usageError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const currentUsage = usageData?.[0] || {
        ai_insights_used: 0,
        data_sources_used: 0,
        team_members_used: 1,
        ai_reports_used: 0,
        business_analytics_used: 0
      };

      // Get user's plan limits
      const { data: subscriptionData, error: subError } = await supabaseClient
        .from('user_subscriptions')
        .select('plan_name')
        .eq('user_id', user_id)
        .in('status', ['active', 'trialing'])
        .single();

      const planName = subscriptionData?.plan_name || 'free_trial';

      const { data: limitsData, error: limitsError } = await supabaseClient
        .from('usage_limits')
        .select('*')
        .eq('plan_name', planName)
        .single();

      if (limitsError) {
        console.error('Error getting limits:', limitsError);
        return new Response(
          JSON.stringify({ error: 'Failed to get usage limits', details: limitsError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const limits = limitsData || {
        ai_insights_limit: 20,
        data_sources_limit: 1,
        team_members_limit: 1,
        ai_reports_limit: 2,
        business_analytics_limit: 1
      };

      response = {
        success: true,
        can_perform: true,
        current_usage: currentUsage,
        limits: limits,
        remaining: {
          ai_insights: limits.ai_insights_limit === -1 ? -1 : Math.max(0, limits.ai_insights_limit - currentUsage.ai_insights_used),
          data_sources: limits.data_sources_limit === -1 ? -1 : Math.max(0, limits.data_sources_limit - currentUsage.data_sources_used),
          team_members: limits.team_members_limit === -1 ? -1 : Math.max(0, limits.team_members_limit - currentUsage.team_members_used),
          ai_reports: limits.ai_reports_limit === -1 ? -1 : Math.max(0, limits.ai_reports_limit - currentUsage.ai_reports_used),
          business_analytics: limits.business_analytics_limit === -1 ? -1 : Math.max(0, limits.business_analytics_limit - currentUsage.business_analytics_used)
        },
        message: 'Usage data retrieved successfully'
      };

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action specified' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in usageTracking function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
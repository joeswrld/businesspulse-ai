import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UsageRequest {
  action: 'feedback' | 'ai_insights' | 'reports' | 'team_members';
  amount?: number;
}

interface UsageResponse {
  success: boolean;
  data?: any;
  error?: string;
  usage_info?: {
    current_usage: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
}

/**
 * Enhanced usage tracking function for Phase 5 monetization
 * Tracks usage and enforces plan limits with real-time notifications
 */
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
    const validActions = ['feedback', 'ai_insights', 'reports', 'team_members']
    if (!validActions.includes(requestBody.action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const amount = requestBody.amount || 1
    console.log(`[${new Date().toISOString()}] Processing usage increment for user ${user.id}, action: ${requestBody.action}, amount: ${amount}`)

    // Get user's current plan and usage
    const { data: billingData, error: billingError } = await supabase
      .from('user_billing_dashboard')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (billingError) {
      console.log(`[${new Date().toISOString()}] Error fetching billing data:`, billingError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch billing data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get current usage and limits based on action
    let currentUsage = 0
    let limit = 0

    switch (requestBody.action) {
      case 'feedback':
        currentUsage = billingData.current_feedback_usage || 0
        limit = billingData.feedback_limit
        break
      case 'ai_insights':
        currentUsage = billingData.current_ai_insights_usage || 0
        limit = billingData.ai_insights_limit
        break
      case 'reports':
        currentUsage = billingData.current_reports_usage || 0
        limit = billingData.reports_limit
        break
      case 'team_members':
        currentUsage = billingData.current_team_members_usage || 0
        limit = billingData.team_members_limit
        break
    }

    // Check if user can perform this action
    const canPerform = limit === -1 || (currentUsage + amount) <= limit

    if (!canPerform) {
      console.log(`[${new Date().toISOString()}] Usage limit reached for user ${user.id}, action: ${requestBody.action}, current: ${currentUsage}, limit: ${limit}`)
      
      // Send limit reached notification
      await supabase.rpc('send_usage_warning_notification', {
        user_uuid: user.id,
        feature_name: requestBody.action,
        current_usage: currentUsage,
        limit_amount: limit
      })

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Usage limit reached for ${requestBody.action}. Current: ${currentUsage}, Limit: ${limit === -1 ? 'Unlimited' : limit}. Please upgrade your plan to continue.`,
          usage_info: {
            current_usage: currentUsage,
            limit: limit,
            remaining: limit === -1 ? null : Math.max(0, limit - currentUsage),
            percentage: limit === -1 ? 0 : Math.round((currentUsage / limit) * 100)
          }
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Increment usage using the database function
    const { data: usageData, error: dbError } = await supabase
      .rpc('increment_usage', {
        user_uuid: user.id,
        feature_name: requestBody.action,
        amount: amount
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

    // Calculate new usage info
    const newUsage = currentUsage + amount
    const remaining = limit === -1 ? null : Math.max(0, limit - newUsage)
    const percentage = limit === -1 ? 0 : Math.round((newUsage / limit) * 100)

    // Send usage warning if approaching limit (80% or more)
    if (percentage >= 80 && limit !== -1) {
      await supabase.rpc('send_usage_warning_notification', {
        user_uuid: user.id,
        feature_name: requestBody.action,
        current_usage: newUsage,
        limit_amount: limit
      })
    }

    console.log(`[${new Date().toISOString()}] Usage incremented successfully for user ${user.id}, action: ${requestBody.action}, new usage: ${newUsage}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: usageData,
        message: 'Usage tracked successfully',
        usage_info: {
          current_usage: newUsage,
          limit: limit,
          remaining: remaining,
          percentage: percentage
        }
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
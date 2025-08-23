import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types for the request and response
interface UsageRequest {
  action: 'feedback' | 'analytics' | 'reports' | 'insights' | 'teams'
}

interface UsageResponse {
  success: boolean
  data?: {
    id: string
    user_id: string
    feedback_count: number
    analytics_count: number
    reports_count: number
    insights_count: number
    teams_count: number
    created_at: string
    updated_at: string
  }
  error?: string
}

// Valid actions for validation
const VALID_ACTIONS: readonly string[] = ['feedback', 'analytics', 'reports', 'insights', 'teams'] as const

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      console.log(`[${new Date().toISOString()}] Method not allowed: ${req.method}`)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed. Only POST requests are supported.'
        } as UsageResponse),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log(`[${new Date().toISOString()}] Missing authorization header`)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing authorization header'
        } as UsageResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${new Date().toISOString()}] Missing environment variables`)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error'
        } as UsageResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
      console.log(`[${new Date().toISOString()}] Authentication failed:`, authError?.message)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or expired token'
        } as UsageResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    let requestBody: UsageRequest
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.log(`[${new Date().toISOString()}] Invalid JSON in request body:`, parseError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        } as UsageResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate request body
    if (!requestBody || typeof requestBody !== 'object') {
      console.log(`[${new Date().toISOString()}] Invalid request body structure`)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Request body must be an object'
        } as UsageResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!requestBody.action) {
      console.log(`[${new Date().toISOString()}] Missing action in request body`)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required field: action'
        } as UsageResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate action
    if (!VALID_ACTIONS.includes(requestBody.action)) {
      console.log(`[${new Date().toISOString()}] Invalid action: ${requestBody.action}`)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid action. Valid actions are: ${VALID_ACTIONS.join(', ')}`
        } as UsageResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[${new Date().toISOString()}] Processing usage increment for user ${user.id}, action: ${requestBody.action}`)

    // Call the increment_usage function
    const { data: usageData, error: dbError } = await supabase
      .rpc('increment_usage', {
        p_user_id: user.id,
        p_action: requestBody.action
      })

    if (dbError) {
      console.error(`[${new Date().toISOString()}] Database error:`, dbError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to update usage data'
        } as UsageResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!usageData) {
      console.error(`[${new Date().toISOString()}] No data returned from increment_usage function`)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No usage data returned'
        } as UsageResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[${new Date().toISOString()}] Successfully updated usage for user ${user.id}, action: ${requestBody.action}`)

    // Return success response
    const response: UsageResponse = {
      success: true,
      data: {
        id: usageData.id,
        user_id: usageData.user_id,
        feedback_count: usageData.feedback_count,
        analytics_count: usageData.analytics_count,
        reports_count: usageData.reports_count,
        insights_count: usageData.insights_count,
        teams_count: usageData.teams_count,
        created_at: usageData.created_at,
        updated_at: usageData.updated_at
      }
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unexpected error:`, error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      } as UsageResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
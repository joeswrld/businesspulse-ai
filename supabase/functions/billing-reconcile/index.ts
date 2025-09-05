import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    // Check admin token
    const adminToken = req.headers.get('x-admin-token')
    const expectedAdminToken = Deno.env.get('ADMIN_TOKEN')
    
    if (!expectedAdminToken || adminToken !== expectedAdminToken) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - admin token required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const summary = {
      processed_subscriptions: 0,
      extended_subscriptions: 0,
      marked_past_due: 0,
      usage_windows_created: 0,
      usage_windows_updated: 0,
      errors: [] as string[]
    }

    // Get all active subscriptions
    const { data: activeSubscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')

    if (subError) {
      summary.errors.push(`Failed to fetch active subscriptions: ${subError.message}`)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions', details: subError }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    summary.processed_subscriptions = activeSubscriptions?.length || 0

    // Process each subscription
    for (const subscription of activeSubscriptions || []) {
      try {
        // Check if subscription period has ended
        if (subscription.current_period_end && new Date(subscription.current_period_end) < new Date()) {
          // Check if there's a successful payment in the last 35 days
          const { data: recentTransactions } = await supabase
            .from('transactions')
            .select('status, created_at')
            .eq('user_id', subscription.user_id)
            .eq('status', 'success')
            .gte('created_at', new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(1)

          if (recentTransactions && recentTransactions.length > 0) {
            // Extend subscription by 30 days
            const newEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            const { error: extendError } = await supabase
              .from('user_subscriptions')
              .update({
                current_period_end: newEndDate.toISOString(),
                current_period_start: new Date().toISOString()
              })
              .eq('id', subscription.id)

            if (extendError) {
              summary.errors.push(`Failed to extend subscription ${subscription.id}: ${extendError.message}`)
            } else {
              summary.extended_subscriptions++
            }
          } else {
            // Mark as past_due
            const { error: updateError } = await supabase
              .from('user_subscriptions')
              .update({ status: 'past_due' })
              .eq('id', subscription.id)

            if (updateError) {
              summary.errors.push(`Failed to mark subscription ${subscription.id} as past_due: ${updateError.message}`)
            } else {
              summary.marked_past_due++
            }
          }
        }

        // Ensure usage window exists and is within [now, +30 days] for pro/business
        if (subscription.plan_tier !== 'free') {
          const { data: usageWindow } = await supabase
            .from('usage_counters')
            .select('*')
            .eq('user_id', subscription.user_id)
            .single()

          const now = new Date()
          const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

          if (!usageWindow) {
            // Create usage window
            const { error: createError } = await supabase
              .from('usage_counters')
              .insert({
                user_id: subscription.user_id,
                period_start: now.toISOString(),
                period_end: thirtyDaysFromNow.toISOString(),
                feedback_count: 0,
                insights_count: 0,
                reports_count: 0,
                last_reset: now.toISOString()
              })

            if (createError) {
              summary.errors.push(`Failed to create usage window for user ${subscription.user_id}: ${createError.message}`)
            } else {
              summary.usage_windows_created++
            }
          } else {
            // Check if window needs updating
            const windowEnd = new Date(usageWindow.period_end)
            if (windowEnd < now || windowEnd > thirtyDaysFromNow) {
              const { error: updateError } = await supabase
                .from('usage_counters')
                .update({
                  period_start: now.toISOString(),
                  period_end: thirtyDaysFromNow.toISOString(),
                  feedback_count: 0,
                  insights_count: 0,
                  reports_count: 0,
                  last_reset: now.toISOString()
                })
                .eq('user_id', subscription.user_id)

              if (updateError) {
                summary.errors.push(`Failed to update usage window for user ${subscription.user_id}: ${updateError.message}`)
              } else {
                summary.usage_windows_updated++
              }
            }
          }
        }
      } catch (error) {
        summary.errors.push(`Error processing subscription ${subscription.id}: ${error}`)
      }
    }

    // Log the reconciliation
    console.log('Billing reconciliation completed:', summary)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Billing reconciliation completed',
        summary,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Billing reconciliation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

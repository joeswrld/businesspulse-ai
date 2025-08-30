import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!PAYSTACK_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Paystack configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all Paystack subscriptions
    const response = await fetch('https://api.paystack.co/subscription', {
      headers: { 
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch Paystack subscriptions')
    }

    const { data: subscriptions } = await response.json()
    let reconciledCount = 0

    // Reconcile each subscription
    for (const sub of subscriptions || []) {
      try {
        // Find user by subscription ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email')
          .eq('subscription_id', sub.subscription_code)
          .single()

        if (userError || !userData) {
          console.log(`No user found for subscription: ${sub.subscription_code}`)
          continue
        }

        // Update user_subscriptions table
        const { error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: userData.id,
            plan_code: sub.plan?.code || 'unknown',
            plan_name: sub.plan?.name || 'Unknown Plan',
            status: sub.status,
            current_period_start: sub.current_period_start,
            current_period_end: sub.next_payment_date,
            updated_at: new Date().toISOString()
          })

        if (subscriptionError) {
          console.error(`Error updating subscription for user ${userData.id}:`, subscriptionError)
          continue
        }

        // Update users table
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            subscription_status: sub.status,
            next_payment_date: sub.next_payment_date,
            updated_at: new Date().toISOString()
          })
          .eq('id', userData.id)

        if (userUpdateError) {
          console.error(`Error updating user ${userData.id}:`, userUpdateError)
          continue
        }

        reconciledCount++
        console.log(`Reconciled subscription for user: ${userData.email}`)

      } catch (error) {
        console.error(`Error reconciling subscription ${sub.subscription_code}:`, error)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Reconciled ${reconciledCount} subscriptions`,
        reconciled_count: reconciledCount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Reconciliation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

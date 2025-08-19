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
    const { action, subscription_id, email } = await req.json()

    if (!action || !email) {
      return new Response(
        JSON.stringify({ error: 'Action and email are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Paystack configuration
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

    switch (action) {
      case 'cancel':
        return await handleSubscriptionCancel(supabase, subscription_id, email, PAYSTACK_SECRET_KEY)
      
      case 'pause':
        return await handleSubscriptionPause(supabase, subscription_id, email, PAYSTACK_SECRET_KEY)
      
      case 'resume':
        return await handleSubscriptionResume(supabase, subscription_id, email, PAYSTACK_SECRET_KEY)
      
      case 'get_status':
        return await handleGetSubscriptionStatus(supabase, subscription_id, PAYSTACK_SECRET_KEY)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action specified' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

  } catch (error) {
    console.error('Subscription management error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function handleSubscriptionCancel(supabase: any, subscription_id: string, email: string, secretKey: string) {
  try {
    // Cancel subscription in Paystack
    const response = await fetch(`https://api.paystack.co/subscription/disable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: subscription_id,
        token: 'disable_token' // Paystack requires this for cancellation
      }),
    })

    const data = await response.json()
    
    if (!data.status) {
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to cancel subscription' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update user subscription in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: 'cancelled',
        plan: 'free',
        updated_at: new Date().toISOString()
      })
      .eq('email', email)

    if (updateError) {
      console.error('Error updating user subscription:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Subscription cancelled successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to cancel subscription' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function handleSubscriptionPause(supabase: any, subscription_id: string, email: string, secretKey: string) {
  try {
    // Pause subscription in Paystack
    const response = await fetch(`https://api.paystack.co/subscription/disable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: subscription_id,
        token: 'disable_token'
      }),
    })

    const data = await response.json()
    
    if (!data.status) {
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to pause subscription' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update user subscription in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('email', email)

    if (updateError) {
      console.error('Error updating user subscription:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Subscription paused successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error pausing subscription:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to pause subscription' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function handleSubscriptionResume(supabase: any, subscription_id: string, email: string, secretKey: string) {
  try {
    // Resume subscription in Paystack
    const response = await fetch(`https://api.paystack.co/subscription/enable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: subscription_id,
        token: 'enable_token'
      }),
    })

    const data = await response.json()
    
    if (!data.status) {
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to resume subscription' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update user subscription in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('email', email)

    if (updateError) {
      console.error('Error updating user subscription:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Subscription resumed successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error resuming subscription:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to resume subscription' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function handleGetSubscriptionStatus(supabase: any, subscription_id: string, secretKey: string) {
  try {
    // Get subscription status from Paystack
    const response = await fetch(`https://api.paystack.co/subscription/${subscription_id}`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
      },
    })

    const data = await response.json()
    
    if (!data.status) {
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to get subscription status' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription: data.data
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error getting subscription status:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to get subscription status' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}
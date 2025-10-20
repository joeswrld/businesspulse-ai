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
    const { email, plan, authorization_code } = await req.json()

    if (!email || !plan) {
      return new Response(
        JSON.stringify({ error: 'Email and plan are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Paystack configuration (LIVE MODE)
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
    const PRO_PLAN_CODE = 'PLN_4z2wpgmw41w2k7r' // Legacy - not in use
    const BUSINESS_PLAN_CODE = 'PLN_7k87nrcofadvkfe' // Live mode business plan

    if (!PAYSTACK_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Paystack configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Map plan names to Paystack plan codes
    const planCodeMap = {
      'pro': PRO_PLAN_CODE,
      'business': BUSINESS_PLAN_CODE
    }

    const planCode = planCodeMap[plan.toLowerCase()]
    if (!planCode) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan specified' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create or get customer first
    let customerResponse = await fetch('https://api.paystack.co/customer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        first_name: email.split('@')[0], // Use email prefix as first name
        last_name: 'User'
      }),
    })

    const customerData = await customerResponse.json()
    
    if (!customerData.status) {
      // If customer creation fails, try to get existing customer
      customerResponse = await fetch(`https://api.paystack.co/customer/${email}`, {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      })
      
      const existingCustomer = await customerResponse.json()
      if (!existingCustomer.status) {
        return new Response(
          JSON.stringify({ error: 'Failed to create or find customer' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    const customer = customerData.data || customerData.data

    // Create subscription
    const subscriptionPayload: any = {
      customer: customer.email,
      plan: planCode,
    }

    // If authorization code is provided, use it for the subscription
    if (authorization_code) {
      subscriptionPayload.authorization = authorization_code
    }

    const subscriptionResponse = await fetch('https://api.paystack.co/subscription', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionPayload),
    })

    const subscriptionData = await subscriptionResponse.json()
    
    if (!subscriptionData.status) {
      return new Response(
        JSON.stringify({ error: subscriptionData.message || 'Failed to create subscription' }),
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

    // Update user subscription in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        plan: plan,
        subscription_id: subscriptionData.data.subscription_code,
        subscription_status: subscriptionData.data.status,
        plan_start_date: new Date().toISOString(),
        next_payment_date: subscriptionData.data.next_payment_date,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)

    if (updateError) {
      console.error('Error updating user subscription:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription: subscriptionData.data,
        customer: customer
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Subscription creation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
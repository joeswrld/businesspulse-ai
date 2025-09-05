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
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { reference, plan, amount, email } = body;

    // Validate required fields
    if (!reference || !plan || !amount || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields', received: { reference, plan, amount, email } }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !paystackSecretKey) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with authorization header
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { 
        global: { 
          headers: { 
            Authorization: authHeader 
          } 
        } 
      }
    )

    // Validate the user by getting user info
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('User validation error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Authenticated user: ${user.id}`)

    // Verify payment with Paystack
    console.log(`Verifying payment reference: ${reference}`)
    
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!paystackResponse.ok) {
      console.error('Paystack API error:', paystackResponse.status, paystackResponse.statusText)
      return new Response(
        JSON.stringify({ error: 'Failed to verify payment with Paystack' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let paystackData;
    try {
      const responseText = await paystackResponse.text();
      if (!responseText) {
        throw new Error('Empty response from Paystack');
      }
      paystackData = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse Paystack response:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid response from Paystack', details: 'Failed to parse response' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log('Paystack response:', JSON.stringify(paystackData, null, 2))

    if (paystackData.status === false) {
      return new Response(
        JSON.stringify({ error: 'Payment verification failed', details: paystackData.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const transaction = paystackData.data

    // Check if payment was successful
    if (transaction.status !== 'success') {
      return new Response(
        JSON.stringify({ error: 'Payment was not successful', status: transaction.status }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if amount matches (Paystack amounts are in kobo)
    if (transaction.amount !== amount) {
      console.error(`Amount mismatch: expected ${amount}, got ${transaction.amount}`)
      return new Response(
        JSON.stringify({ 
          error: 'Amount mismatch', 
          expected: amount, 
          received: transaction.amount 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Use the authenticated user (we already validated them above)
    console.log(`Using authenticated user: ${user.id}`)
    
    // Verify the email matches (additional security check)
    if (user.email !== email) {
      console.error(`Email mismatch: authenticated user email ${user.email} does not match request email ${email}`)
      return new Response(
        JSON.stringify({ error: 'Email mismatch' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create or update billing profile
    const { error: billingError } = await supabase
      .from('billing_profiles')
      .upsert({
        id: user.id,
        plan: plan,
        trial_ends_at: null,
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        subscription_status: 'active',
        paystack_customer_id: transaction.customer?.customer_code || null,
        paystack_subscription_id: transaction.subscription?.subscription_code || null,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (billingError) {
      console.error('Billing profile update error:', billingError)
      return new Response(
        JSON.stringify({ error: 'Failed to update billing profile', details: billingError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Billing profile updated successfully')

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: amount,
        currency: 'NGN',
        status: 'success',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Subscription`,
        paystack_reference: reference,
        created_at: new Date().toISOString()
      })

    if (transactionError) {
      console.error('Transaction record error:', transactionError)
      return new Response(
        JSON.stringify({ error: 'Failed to record transaction', details: transactionError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Transaction record created successfully')

    // Update user subscription
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        plan_code: plan === 'pro' ? 'PLN_4z2wpgmw41w2k7r' : 'PLN_esryg99ztsy9xc8',
        plan_name: plan === 'pro' ? 'Pro Plan' : 'Business Plan',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        canceled_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (subscriptionError) {
      console.error('Subscription update error:', subscriptionError)
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription', details: subscriptionError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('User subscription updated successfully')

    // Log successful upgrade
    console.log(`User ${user.id} upgraded to ${plan} plan successfully`)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription activated successfully',
        data: {
          user_id: user.id,
          plan: plan,
          reference: reference,
          amount: amount,
          paystack_transaction_id: transaction.id
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Payment verification error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import crypto from 'https://deno.land/std@0.168.0/node/crypto.ts'

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
    // Get environment variables
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!paystackSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the raw body for signature verification
    const body = await req.text()
    const signature = req.headers.get('x-paystack-signature')

    if (!signature) {
      console.error('Missing Paystack signature')
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify Paystack signature
    const hash = crypto.createHmac('sha512', paystackSecret)
      .update(body)
      .digest('hex')

    if (hash !== signature) {
      console.error('Invalid Paystack signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the webhook payload
    const event = JSON.parse(body)
    console.log('Received Paystack webhook:', event.event, event.data?.id)

    // Handle different event types
    switch (event.event) {
      case 'subscription.create':
      case 'subscription.enable':
        await handleSubscriptionCreate(supabase, event.data)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(supabase, event.data)
        break

      case 'subscription.disable':
      case 'subscription.cancelled':
        await handleSubscriptionCancel(supabase, event.data)
        break

      case 'customer.subscription.created':
        await handleCustomerSubscriptionCreated(supabase, event.data)
        break

      default:
        console.log('Unhandled event type:', event.event)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleSubscriptionCreate(supabase: any, data: any) {
  try {
    const { customer, subscription } = data
    
    // Find user by Paystack customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('paystack_customer_id', customer.customer_code)
      .single()

    if (profileError || !profile) {
      console.error('User not found for customer:', customer.customer_code)
      return
    }

    // Update or create subscription record
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: profile.id,
        paystack_subscription_id: subscription.subscription_code,
        status: 'active',
        plan_code: subscription.plan.plan_code,
        current_period_start: new Date(subscription.createdAt).toISOString(),
        current_period_end: new Date(subscription.next_payment_date).toISOString(),
        updated_at: new Date().toISOString()
      })

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError)
      return
    }

    // Update user profile
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        plan_status: 'active',
        paystack_subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError)
    }

    console.log('Subscription created successfully for user:', profile.id)
  } catch (error) {
    console.error('Error in handleSubscriptionCreate:', error)
  }
}

async function handlePaymentSuccess(supabase: any, data: any) {
  try {
    const { customer, subscription } = data
    
    // Find user by Paystack customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('paystack_customer_id', customer.customer_code)
      .single()

    if (profileError || !profile) {
      console.error('User not found for customer:', customer.customer_code)
      return
    }

    // Update subscription status
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: new Date(data.paid_at).toISOString(),
        current_period_end: new Date(data.next_payment_date).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', profile.id)

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError)
      return
    }

    // Update user profile
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        plan_status: 'active',
        paystack_subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError)
    }

    console.log('Payment processed successfully for user:', profile.id)
  } catch (error) {
    console.error('Error in handlePaymentSuccess:', error)
  }
}

async function handleSubscriptionCancel(supabase: any, data: any) {
  try {
    const { customer, subscription } = data
    
    // Find user by Paystack customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('paystack_customer_id', customer.customer_code)
      .single()

    if (profileError || !profile) {
      console.error('User not found for customer:', customer.customer_code)
      return
    }

    // Update subscription status
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', profile.id)

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError)
      return
    }

    // Update user profile to expired
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        plan_status: 'expired',
        paystack_subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError)
    }

    console.log('Subscription cancelled for user:', profile.id)
  } catch (error) {
    console.error('Error in handleSubscriptionCancel:', error)
  }
}

async function handleCustomerSubscriptionCreated(supabase: any, data: any) {
  try {
    const { customer, subscription } = data
    
    // Find user by Paystack customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('paystack_customer_id', customer.customer_code)
      .single()

    if (profileError || !profile) {
      console.error('User not found for customer:', customer.customer_code)
      return
    }

    // Create subscription record
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: profile.id,
        paystack_subscription_id: subscription.subscription_code,
        status: 'active',
        plan_code: subscription.plan.plan_code,
        current_period_start: new Date(subscription.createdAt).toISOString(),
        current_period_end: new Date(subscription.next_payment_date).toISOString()
      })

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError)
      return
    }

    // Update user profile
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        plan_status: 'active',
        paystack_subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError)
    }

    console.log('Customer subscription created successfully for user:', profile.id)
  } catch (error) {
    console.error('Error in handleCustomerSubscriptionCreated:', error)
  }
}
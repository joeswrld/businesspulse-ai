import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the webhook payload
    const payload = await req.json()
    console.log('📡 Paystack webhook received:', payload)

    // Verify webhook signature (optional but recommended)
    const signature = req.headers.get('x-paystack-signature')
    if (!signature) {
      console.warn('⚠️ No signature found in webhook')
    }

    // Extract event data
    const { event, data } = payload
    console.log('🎯 Processing event:', event)

    // Handle different webhook events
    switch (event) {
      case 'subscription.create':
      case 'subscription.enable':
        await handleSubscriptionActivation(supabaseClient, data)
        break

      case 'subscription.disable':
      case 'subscription.terminate':
        await handleSubscriptionDeactivation(supabaseClient, data)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailure(supabaseClient, data)
        break

      case 'invoice.payment_successful':
        await handlePaymentSuccess(supabaseClient, data)
        break

      default:
        console.log('ℹ️ Unhandled event type:', event)
    }

    // Log webhook event for audit
    await logWebhookEvent(supabaseClient, event, payload, signature)

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function handleSubscriptionActivation(supabaseClient: any, data: any) {
  console.log('✅ Handling subscription activation:', data)
  
  const { customer, subscription } = data
  const customerEmail = customer.email

  // Find user by email
  const { data: user, error: userError } = await supabaseClient.auth.admin.getUserByEmail(customerEmail)
  
  if (userError || !user) {
    console.error('❌ User not found for email:', customerEmail)
    return
  }

  const userId = user.user.id

  // Update user profile to business plan
  const { error: profileError } = await supabaseClient
    .from('profiles')
    .update({
      plan: 'business',
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (profileError) {
    console.error('❌ Error updating profile:', profileError)
    return
  }

  // Update or create billing profile
  const { error: billingError } = await supabaseClient
    .from('billing_profiles')
    .upsert({
      id: userId,
      plan: 'business',
      subscription_status: 'active',
      paystack_customer_id: customer.customer_code,
      paystack_subscription_id: subscription.subscription_code,
      next_billing_date: new Date(subscription.next_payment_date).toISOString(),
      updated_at: new Date().toISOString()
    })

  if (billingError) {
    console.error('❌ Error updating billing profile:', billingError)
    return
  }

  console.log('✅ Successfully activated business plan for user:', userId)
}

async function handleSubscriptionDeactivation(supabaseClient: any, data: any) {
  console.log('❌ Handling subscription deactivation:', data)
  
  const { customer, subscription } = data
  const customerEmail = customer.email

  // Find user by email
  const { data: user, error: userError } = await supabaseClient.auth.admin.getUserByEmail(customerEmail)
  
  if (userError || !user) {
    console.error('❌ User not found for email:', customerEmail)
    return
  }

  const userId = user.user.id

  // Update user profile to inactive
  const { error: profileError } = await supabaseClient
    .from('profiles')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (profileError) {
    console.error('❌ Error updating profile:', profileError)
    return
  }

  // Update billing profile
  const { error: billingError } = await supabaseClient
    .from('billing_profiles')
    .update({
      subscription_status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (billingError) {
    console.error('❌ Error updating billing profile:', billingError)
    return
  }

  console.log('✅ Successfully deactivated subscription for user:', userId)
}

async function handlePaymentFailure(supabaseClient: any, data: any) {
  console.log('💳 Handling payment failure:', data)
  
  const { customer } = data
  const customerEmail = customer.email

  // Find user by email
  const { data: user, error: userError } = await supabaseClient.auth.admin.getUserByEmail(customerEmail)
  
  if (userError || !user) {
    console.error('❌ User not found for email:', customerEmail)
    return
  }

  const userId = user.user.id

  // Update billing profile to past_due
  const { error: billingError } = await supabaseClient
    .from('billing_profiles')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (billingError) {
    console.error('❌ Error updating billing profile:', billingError)
    return
  }

  console.log('✅ Successfully marked payment as failed for user:', userId)
}

async function handlePaymentSuccess(supabaseClient: any, data: any) {
  console.log('💳 Handling payment success:', data)
  
  const { customer, subscription } = data
  const customerEmail = customer.email

  // Find user by email
  const { data: user, error: userError } = await supabaseClient.auth.admin.getUserByEmail(customerEmail)
  
  if (userError || !user) {
    console.error('❌ User not found for email:', customerEmail)
    return
  }

  const userId = user.user.id

  // Update user profile to active
  const { error: profileError } = await supabaseClient
    .from('profiles')
    .update({
      plan: 'business',
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (profileError) {
    console.error('❌ Error updating profile:', profileError)
    return
  }

  // Update billing profile
  const { error: billingError } = await supabaseClient
    .from('billing_profiles')
    .update({
      subscription_status: 'active',
      next_billing_date: new Date(subscription.next_payment_date).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (billingError) {
    console.error('❌ Error updating billing profile:', billingError)
    return
  }

  console.log('✅ Successfully processed payment for user:', userId)
}

async function logWebhookEvent(supabaseClient: any, event: string, payload: any, signature: string | null) {
  try {
    await supabaseClient
      .from('webhook_events')
      .insert({
        provider: 'paystack',
        event: event,
        signature: signature,
        payload: payload,
        received_at: new Date().toISOString(),
        processed_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('❌ Error logging webhook event:', error)
  }
}
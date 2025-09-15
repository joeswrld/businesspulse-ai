import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import crypto from 'https://deno.land/std@0.168.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Enhanced Paystack webhook handler for Phase 5 monetization
 * Handles subscription events and updates user billing status
 */
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
    console.log(`[${new Date().toISOString()}] Received Paystack webhook:`, event.event, event.data?.id)

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

      case 'subscription.not_renewing':
        await handleSubscriptionNotRenewing(supabase, event.data)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(supabase, event.data)
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
      .select('id, email')
      .eq('paystack_customer_id', customer.customer_code)
      .single()

    if (profileError || !profile) {
      console.error('User not found for customer:', customer.customer_code)
      return
    }

    // Determine plan tier from Paystack plan code
    const planTier = getPlanTierFromCode(subscription.plan.plan_code)

    // Update user profile with new plan
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        plan: planTier,
        subscription_status: 'active',
        paystack_subscription_id: subscription.subscription_code,
        subscription_end_date: new Date(subscription.next_payment_date).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError)
      return
    }

    // Record subscription history
    await supabase
      .from('subscription_history')
      .insert({
        user_id: profile.id,
        action: 'upgrade',
        new_plan: planTier,
        paystack_transaction_id: subscription.subscription_code,
        amount_paid: subscription.plan.amount,
        metadata: {
          paystack_subscription_id: subscription.subscription_code,
          plan_code: subscription.plan.plan_code
        }
      })

    // Send success notification
    await supabase
      .from('billing_notifications')
      .insert({
        user_id: profile.id,
        notification_type: 'subscription_activated',
        title: 'Subscription Activated',
        message: `Your ${planTier} subscription has been activated successfully!`,
        metadata: {
          plan_tier: planTier,
          subscription_id: subscription.subscription_code
        }
      })

    console.log(`Subscription created successfully for user: ${profile.id}, plan: ${planTier}`)
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
      .select('id, email')
      .eq('paystack_customer_id', customer.customer_code)
      .single()

    if (profileError || !profile) {
      console.error('User not found for customer:', customer.customer_code)
      return
    }

    // Update subscription status
    const { error: subscriptionError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_end_date: new Date(data.next_payment_date).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError)
      return
    }

    // Record payment in subscription history
    await supabase
      .from('subscription_history')
      .insert({
        user_id: profile.id,
        action: 'payment_success',
        paystack_transaction_id: data.reference,
        amount_paid: data.amount,
        metadata: {
          payment_reference: data.reference,
          next_payment_date: data.next_payment_date
        }
      })

    console.log(`Payment processed successfully for user: ${profile.id}`)
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
      .select('id, email')
      .eq('paystack_customer_id', customer.customer_code)
      .single()

    if (profileError || !profile) {
      console.error('User not found for customer:', customer.customer_code)
      return
    }

    // Update subscription status
    const { error: subscriptionError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError)
      return
    }

    // Record cancellation in subscription history
    await supabase
      .from('subscription_history')
      .insert({
        user_id: profile.id,
        action: 'cancel',
        paystack_transaction_id: subscription.subscription_code,
        metadata: {
          cancellation_reason: 'user_requested',
          cancelled_at: new Date().toISOString()
        }
      })

    // Send cancellation notification
    await supabase
      .from('billing_notifications')
      .insert({
        user_id: profile.id,
        notification_type: 'subscription_cancelled',
        title: 'Subscription Cancelled',
        message: 'Your subscription has been cancelled. You can continue using your current plan until the end of your billing period.',
        metadata: {
          subscription_id: subscription.subscription_code,
          cancelled_at: new Date().toISOString()
        }
      })

    console.log(`Subscription cancelled for user: ${profile.id}`)
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
      .select('id, email')
      .eq('paystack_customer_id', customer.customer_code)
      .single()

    if (profileError || !profile) {
      console.error('User not found for customer:', customer.customer_code)
      return
    }

    const planTier = getPlanTierFromCode(subscription.plan.plan_code)

    // Update user profile
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        plan: planTier,
        subscription_status: 'active',
        paystack_subscription_id: subscription.subscription_code,
        subscription_end_date: new Date(subscription.next_payment_date).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError)
      return
    }

    console.log(`Customer subscription created successfully for user: ${profile.id}`)
  } catch (error) {
    console.error('Error in handleCustomerSubscriptionCreated:', error)
  }
}

async function handleSubscriptionNotRenewing(supabase: any, data: any) {
  try {
    const { customer, subscription } = data
    
    // Find user by Paystack customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('paystack_customer_id', customer.customer_code)
      .single()

    if (profileError || !profile) {
      console.error('User not found for customer:', customer.customer_code)
      return
    }

    // Send notification about non-renewal
    await supabase
      .from('billing_notifications')
      .insert({
        user_id: profile.id,
        notification_type: 'subscription_not_renewing',
        title: 'Subscription Not Renewing',
        message: 'Your subscription is set to not renew. You will be downgraded to the free plan at the end of your current billing period.',
        metadata: {
          subscription_id: subscription.subscription_code,
          current_period_end: subscription.current_period_end
        }
      })

    console.log(`Subscription not renewing notification sent for user: ${profile.id}`)
  } catch (error) {
    console.error('Error in handleSubscriptionNotRenewing:', error)
  }
}

async function handlePaymentFailed(supabase: any, data: any) {
  try {
    const { customer, subscription } = data
    
    // Find user by Paystack customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('paystack_customer_id', customer.customer_code)
      .single()

    if (profileError || !profile) {
      console.error('User not found for customer:', customer.customer_code)
      return
    }

    // Update subscription status to past_due
    const { error: subscriptionError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError)
      return
    }

    // Send payment failed notification
    await supabase
      .from('billing_notifications')
      .insert({
        user_id: profile.id,
        notification_type: 'payment_failed',
        title: 'Payment Failed',
        message: 'Your payment failed. Please update your payment method to continue your subscription.',
        metadata: {
          subscription_id: subscription.subscription_code,
          failed_amount: data.amount,
          failure_reason: data.failure_reason || 'unknown'
        }
      })

    console.log(`Payment failed notification sent for user: ${profile.id}`)
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error)
  }
}

function getPlanTierFromCode(planCode: string): string {
  // Map Paystack plan codes to our plan tiers
  const planMapping: Record<string, string> = {
    'PLN_4z2wpgmw41w2k7r': 'business',
    'PLN_esryg99ztsy9xc8': 'scale'
  }
  
  return planMapping[planCode] || 'free'
}
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

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
    const body = await req.text()
    const signature = req.headers.get('x-paystack-signature')
    
    // Verify webhook signature
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!PAYSTACK_SECRET_KEY) {
      console.error('Paystack configuration missing')
      return new Response(
        JSON.stringify({ error: 'Paystack configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify signature
    const encoder = new TextEncoder()
    const key = encoder.encode(PAYSTACK_SECRET_KEY)
    const message = encoder.encode(body)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    )
    const signatureBytes = await crypto.subtle.sign('HMAC', cryptoKey, message)
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const event = JSON.parse(body)
    console.log('Paystack webhook event:', event.event)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check idempotency - compute hash of payload
    const payloadHash = await computeSHA256(body)
    
    // Check if we've already processed this webhook
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('seen_hash', payloadHash)
      .single()

    if (existingEvent) {
      console.log('Webhook already processed, skipping:', payloadHash)
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log webhook event for idempotency
    const { error: logError } = await supabase
      .from('webhook_events')
      .insert({
        provider: 'paystack',
        event: event.event,
        signature: signature,
        payload: event,
        seen_hash: payloadHash,
        processed_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Error logging webhook event:', logError)
    }

    // Process the webhook event
    switch (event.event) {
      case 'subscription.create':
        await handleSubscriptionCreate(supabase, event.data)
        break
      
      case 'subscription.disable':
        await handleSubscriptionDisable(supabase, event.data)
        break
      
      case 'charge.success':
        await handleChargeSuccess(supabase, event.data)
        break
      
      case 'charge.failed':
        await handleChargeFailed(supabase, event.data)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(supabase, event.data)
        break
      
      case 'invoice.payment_success':
        await handlePaymentSuccess(supabase, event.data)
        break
      
      default:
        console.log('Unhandled event type:', event.event)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Compute SHA256 hash for idempotency
async function computeSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function handleSubscriptionCreate(supabase: any, data: any) {
  try {
    console.log('Processing subscription.create:', data)
    
    // Get user_id from metadata or customer email
    const userId = data.metadata?.user_id || await getUserIdFromEmail(supabase, data.customer.email)
    
    if (!userId) {
      console.error('Could not find user for subscription create')
      return
    }

    // Map plan_code to plan_tier
    let planTier = 'pro'
    if (data.plan?.plan_code === 'PLN_esryg99ztsy9xc8') {
      planTier = 'business'
    } else if (data.plan?.plan_code === 'PLN_4z2wpgmw41w2k7r') {
      planTier = 'pro'
    }

    // Calculate billing period (monthly)
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

    // Update or create user subscription
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        plan_code: data.plan?.plan_code || 'PLN_4z2wpgmw41w2k7r',
        plan_tier: planTier,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: nextMonth.toISOString(),
        paystack_subscription_code: data.subscription_code,
        paystack_email_token: data.email_token
      }, {
        onConflict: 'user_id'
      })

    if (subError) {
      console.error('Error updating user subscription:', subError)
      return
    }

    // Update user plan status in profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        plan: planTier === 'business' ? 'business' : 'pro',
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error updating user profile plan:', profileError);
    } else {
      console.log(`✅ User plan updated to ${planTier} for user:`, userId);
    }

    // Reset usage counters for new plan (monthly window)
    const { error: usageError } = await supabase
      .from('usage_counters')
      .upsert({
        user_id: userId,
        period_start: now.toISOString(),
        period_end: nextMonth.toISOString(),
        feedback_count: 0,
        insights_count: 0,
        reports_count: 0,
        last_reset: now.toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (usageError) {
      console.error('Error resetting usage counters:', usageError)
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount_kobo: data.amount || 0,
        status: 'success',
        description: `Subscription to ${data.plan?.name || 'Pro Plan'}`,
        reference: data.reference || `sub_${Date.now()}`,
        raw: data
      })

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
    }

    console.log('Successfully processed subscription.create for user:', userId)
  } catch (error) {
    console.error('Error handling subscription create:', error)
  }
}

async function handleSubscriptionDisable(supabase: any, data: any) {
  try {
    console.log('Processing subscription.disable:', data)
    
    // Find user by subscription ID
    const { data: subscription, error: findError } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('paystack_subscription_code', data.subscription_code)
      .single()

    if (findError || !subscription) {
      console.error('Could not find subscription for disable:', data.subscription_code)
      return
    }

    // Update subscription status
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        cancel_at_period_end: true
      })
      .eq('paystack_subscription_code', data.subscription_code)

    if (updateError) {
      console.error('Error updating subscription for disable:', updateError)
      return
    }

    // Update user plan status in profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', subscription.user_id);

    if (profileError) {
      console.error('Error updating user profile status:', profileError);
    } else {
      console.log('✅ User profile deactivated for user:', subscription.user_id);
    }

    console.log('Successfully processed subscription.disable for user:', subscription.user_id)
  } catch (error) {
    console.error('Error handling subscription disable:', error)
  }
}

async function handleChargeSuccess(supabase: any, data: any) {
  try {
    console.log('Processing charge.success:', data)
    
    // Find user by subscription ID
    const { data: subscription, error: findError } = await supabase
      .from('user_subscriptions')
      .select('user_id, plan_tier')
      .eq('paystack_subscription_code', data.subscription)
      .single()

    if (findError || !subscription) {
      console.error('Could not find subscription for charge success:', data.subscription)
      return
    }

    // Calculate next billing period (monthly)
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

    // Update subscription period
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: nextMonth.toISOString()
      })
      .eq('paystack_subscription_code', data.subscription)

    if (updateError) {
      console.error('Error updating subscription for charge success:', updateError)
    }

    // Reset usage counters for monthly renewal (except Business which is unlimited)
    if (subscription.plan_tier !== 'business') {
      const { error: usageError } = await supabase
        .from('usage_counters')
        .upsert({
          user_id: subscription.user_id,
          period_start: now.toISOString(),
          period_end: nextMonth.toISOString(),
          feedback_count: 0,
          insights_count: 0,
          reports_count: 0,
          last_reset: now.toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (usageError) {
        console.error('Error resetting usage counters for renewal:', usageError)
      }
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: subscription.user_id,
        amount_kobo: data.amount || 0,
        status: 'success',
        description: 'Subscription renewal',
        reference: data.reference || `charge_${Date.now()}`,
        raw: data
      })

    if (transactionError) {
      console.error('Error creating transaction for charge success:', transactionError)
    }

    console.log('Successfully processed charge.success for user:', subscription.user_id)
  } catch (error) {
    console.error('Error handling charge success:', error)
  }
}

async function handleChargeFailed(supabase: any, data: any) {
  try {
    console.log('Processing charge.failed:', data)
    
    // Find user by subscription ID
    const { data: subscription, error: findError } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('paystack_subscription_code', data.subscription)
      .single()

    if (findError || !subscription) {
      console.error('Could not find subscription for charge failed:', data.subscription)
      return
    }

    // Update subscription status
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'past_due'
      })
      .eq('paystack_subscription_code', data.subscription)

    if (updateError) {
      console.error('Error updating subscription for charge failed:', updateError)
    }

    // Create failed transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: subscription.user_id,
        amount_kobo: data.amount || 0,
        status: 'failed',
        description: 'Payment failed',
        reference: data.reference || `failed_${Date.now()}`,
        raw: data
      })

    if (transactionError) {
      console.error('Error creating transaction for charge failed:', transactionError)
    }

    console.log('Successfully processed charge.failed for user:', subscription.user_id)
  } catch (error) {
    console.error('Error handling charge failed:', error)
  }
}

async function handlePaymentFailed(supabase: any, data: any) {
  try {
    console.log('Processing invoice.payment_failed:', data)
    
    // Find user by subscription ID
    const { data: subscription, error: findError } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('paystack_subscription_code', data.subscription)
      .single()

    if (findError || !subscription) {
      console.error('Could not find subscription for payment failed:', data.subscription)
      return
    }

    // Update subscription status
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'past_due'
      })
      .eq('paystack_subscription_code', data.subscription)

    if (updateError) {
      console.error('Error updating subscription for payment failed:', updateError)
    }

    // Create failed transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: subscription.user_id,
        amount_kobo: data.amount || 0,
        status: 'failed',
        description: 'Payment failed',
        reference: data.reference || `invoice_failed_${Date.now()}`,
        invoice_url: data.invoice_url,
        raw: data
      })

    if (transactionError) {
      console.error('Error creating transaction for payment failed:', transactionError)
    }

    console.log('Successfully processed invoice.payment_failed for user:', subscription.user_id)
  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}

async function handlePaymentSuccess(supabase: any, data: any) {
  try {
    console.log('Processing invoice.payment_success:', data)
    
    // Find user by subscription ID
    const { data: subscription, error: findError } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('paystack_subscription_code', data.subscription)
      .single()

    if (findError || !subscription) {
      console.error('Could not find subscription for payment success:', data.subscription)
      return
    }

    // Update subscription
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: data.next_payment_date || new Date(Date.now() + 30*24*60*60*1000).toISOString()
      })
      .eq('paystack_subscription_code', data.subscription)

    if (updateError) {
      console.error('Error updating subscription for payment success:', updateError)
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: subscription.user_id,
        amount_kobo: data.amount || 0,
        status: 'success',
        description: 'Payment successful',
        reference: data.reference || `invoice_success_${Date.now()}`,
        invoice_url: data.invoice_url,
        raw: data
      })

    if (transactionError) {
      console.error('Error creating transaction for payment success:', transactionError)
    }

    console.log('Successfully processed invoice.payment_success for user:', subscription.user_id)
  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

async function getUserIdFromEmail(supabase: any, email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single()

    if (error) {
      console.error('Error finding user by email:', error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error('Error in getUserIdFromEmail:', error)
    return null
  }
}

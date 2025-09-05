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

async function handleSubscriptionCreate(supabase: any, data: any) {
  try {
    // Get user_id from metadata or customer email
    const userId = data.metadata?.user_id || await getUserIdFromEmail(supabase, data.customer.email)
    
    if (!userId) {
      console.error('Could not find user for subscription create')
      return
    }

    // Update billing profile
    const { error: billingError } = await supabase
      .from('billing_profiles')
      .update({
        plan: data.plan?.name?.toLowerCase() || 'pro',
        subscription_status: 'active',
        next_billing_date: data.next_payment_date,
        paystack_customer_id: data.customer.customer_code,
        paystack_subscription_id: data.subscription_code
      })
      .eq('id', userId)

    if (billingError) {
      console.error('Error updating billing profile:', billingError)
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount: data.amount,
        status: 'success',
        description: `Subscription to ${data.plan?.name || 'Pro Plan'}`,
        paystack_reference: data.reference
      })

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
    }
  } catch (error) {
    console.error('Error handling subscription create:', error)
  }
}

async function handleSubscriptionDisable(supabase: any, data: any) {
  try {
    // Find user by subscription ID
    const { data: billingProfile, error: findError } = await supabase
      .from('billing_profiles')
      .select('id')
      .eq('paystack_subscription_id', data.subscription_code)
      .single()

    if (findError || !billingProfile) {
      console.error('Could not find billing profile for subscription disable')
      return
    }

    // Update billing profile
    const { error: updateError } = await supabase
      .from('billing_profiles')
      .update({
        plan: 'free',
        subscription_status: 'cancelled',
        next_billing_date: null
      })
      .eq('id', billingProfile.id)

    if (updateError) {
      console.error('Error updating billing profile for disable:', updateError)
    }
  } catch (error) {
    console.error('Error handling subscription disable:', error)
  }
}

async function handleChargeSuccess(supabase: any, data: any) {
  try {
    // Find user by subscription ID
    const { data: billingProfile, error: findError } = await supabase
      .from('billing_profiles')
      .select('id')
      .eq('paystack_subscription_id', data.subscription)
      .single()

    if (findError || !billingProfile) {
      console.error('Could not find billing profile for charge success')
      return
    }

    // Update billing profile
    const { error: updateError } = await supabase
      .from('billing_profiles')
      .update({
        subscription_status: 'active',
        next_billing_date: new Date(Date.now() + 30*24*60*60*1000).toISOString()
      })
      .eq('id', billingProfile.id)

    if (updateError) {
      console.error('Error updating billing profile for charge success:', updateError)
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: billingProfile.id,
        amount: data.amount,
        status: 'success',
        description: 'Subscription renewal',
        paystack_reference: data.reference
      })

    if (transactionError) {
      console.error('Error creating transaction for charge success:', transactionError)
    }
  } catch (error) {
    console.error('Error handling charge success:', error)
  }
}

async function handleChargeFailed(supabase: any, data: any) {
  try {
    // Find user by subscription ID
    const { data: billingProfile, error: findError } = await supabase
      .from('billing_profiles')
      .select('id')
      .eq('paystack_subscription_id', data.subscription)
      .single()

    if (findError || !billingProfile) {
      console.error('Could not find billing profile for charge failed')
      return
    }

    // Update billing profile
    const { error: updateError } = await supabase
      .from('billing_profiles')
      .update({
        subscription_status: 'past_due'
      })
      .eq('id', billingProfile.id)

    if (updateError) {
      console.error('Error updating billing profile for charge failed:', updateError)
    }

    // Create failed transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: billingProfile.id,
        amount: data.amount,
        status: 'failed',
        description: 'Payment failed',
        paystack_reference: data.reference
      })

    if (transactionError) {
      console.error('Error creating transaction for charge failed:', transactionError)
    }
  } catch (error) {
    console.error('Error handling charge failed:', error)
  }
}

async function handlePaymentFailed(supabase: any, data: any) {
  try {
    // Find user by subscription ID
    const { data: billingProfile, error: findError } = await supabase
      .from('billing_profiles')
      .select('id')
      .eq('paystack_subscription_id', data.subscription)
      .single()

    if (findError || !billingProfile) {
      console.error('Could not find billing profile for payment failed')
      return
    }

    // Update billing profile
    const { error: updateError } = await supabase
      .from('billing_profiles')
      .update({
        subscription_status: 'past_due'
      })
      .eq('id', billingProfile.id)

    if (updateError) {
      console.error('Error updating billing profile for payment failed:', updateError)
    }

    // Create failed transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: billingProfile.id,
        amount: data.amount,
        status: 'failed',
        description: 'Payment failed',
        paystack_reference: data.reference
      })

    if (transactionError) {
      console.error('Error creating transaction for payment failed:', transactionError)
    }
  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}

async function handlePaymentSuccess(supabase: any, data: any) {
  try {
    // Find user by subscription ID
    const { data: billingProfile, error: findError } = await supabase
      .from('billing_profiles')
      .select('id')
      .eq('paystack_subscription_id', data.subscription)
      .single()

    if (findError || !billingProfile) {
      console.error('Could not find billing profile for payment success')
      return
    }

    // Update billing profile
    const { error: updateError } = await supabase
      .from('billing_profiles')
      .update({
        subscription_status: 'active',
        next_billing_date: data.next_payment_date
      })
      .eq('id', billingProfile.id)

    if (updateError) {
      console.error('Error updating billing profile for payment success:', updateError)
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: billingProfile.id,
        amount: data.amount,
        status: 'success',
        description: 'Payment successful',
        paystack_reference: data.reference
      })

    if (transactionError) {
      console.error('Error creating transaction for payment success:', transactionError)
    }
  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

async function getUserIdFromEmail(supabase: any, email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('users')
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
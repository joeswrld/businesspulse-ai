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
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: data.status,
        subscription_id: data.subscription_code,
        plan_start_date: new Date().toISOString(),
        next_payment_date: data.next_payment_date,
        updated_at: new Date().toISOString()
      })
      .eq('email', data.customer.email)

    if (error) {
      console.error('Error updating subscription create:', error)
    }
  } catch (error) {
    console.error('Error handling subscription create:', error)
  }
}

async function handleSubscriptionDisable(supabase: any, data: any) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'cancelled',
        plan: 'free',
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', data.subscription_code)

    if (error) {
      console.error('Error updating subscription disable:', error)
    }
  } catch (error) {
    console.error('Error handling subscription disable:', error)
  }
}

async function handleChargeSuccess(supabase: any, data: any) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        last_payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', data.subscription)

    if (error) {
      console.error('Error updating charge success:', error)
    }
  } catch (error) {
    console.error('Error handling charge success:', error)
  }
}

async function handleChargeFailed(supabase: any, data: any) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', data.subscription)

    if (error) {
      console.error('Error updating charge failed:', error)
    }
  } catch (error) {
    console.error('Error handling charge failed:', error)
  }
}

async function handlePaymentFailed(supabase: any, data: any) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', data.subscription)

    if (error) {
      console.error('Error updating payment failed:', error)
    }
  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}

async function handlePaymentSuccess(supabase: any, data: any) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        last_payment_date: new Date().toISOString(),
        next_payment_date: data.next_payment_date,
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', data.subscription)

    if (error) {
      console.error('Error updating payment success:', error)
    }
  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}
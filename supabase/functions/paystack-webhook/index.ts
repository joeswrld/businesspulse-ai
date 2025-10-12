// PAYSTACK WEBHOOK HANDLER
// File: supabase/functions/paystack-webhook/index.ts
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

interface PaystackEvent {
  event: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    customer: {
      email: string;
      customer_code: string;
    };
    metadata?: {
      user_id?: string;
      plan?: string;
    };
    subscription?: {
      subscription_code: string;
      email_token: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify Paystack signature
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();
    const hash = await crypto.subtle.digest(
      'SHA-512',
      new TextEncoder().encode(Deno.env.get('PAYSTACK_SECRET_KEY')! + body)
    );
    const expectedSignature = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event: PaystackEvent = JSON.parse(body);
    console.log('Paystack Event:', event.event, event.data);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(supabase, event);
        break;
      
      case 'subscription.create':
        await handleSubscriptionCreate(supabase, event);
        break;
      
      case 'subscription.disable':
      case 'subscription.not_renew':
        await handleSubscriptionDisable(supabase, event);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(supabase, event);
        break;
      
      default:
        console.log('Unhandled event type:', event.event);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================================
// WEBHOOK EVENT HANDLERS
// ============================================================================

async function handleChargeSuccess(supabase: any, event: PaystackEvent) {
  const { data, status, reference, amount, currency, customer, metadata } = event.data;
  
  if (status !== 'success') return;

  const userId = metadata?.user_id;
  if (!userId) {
    console.error('No user_id in metadata');
    return;
  }

  // Record transaction
  await supabase.from('transactions').insert({
    user_id: userId,
    amount,
    currency,
    status: 'success',
    paystack_reference: reference,
    description: 'Subscription Payment',
    created_at: new Date().toISOString(),
  });

  // Update billing profile - INSTANT ACCESS
  const nextBillingDate = new Date();
  nextBillingDate.setDate(nextBillingDate.getDate() + 30);

  await supabase.from('billing_profiles').update({
    plan: 'business',
    subscription_status: 'active',
    next_billing_date: nextBillingDate.toISOString(),
    paystack_customer_id: customer.customer_code,
    trial_ends_at: null, // Clear trial date
  }).eq('id', userId);

  console.log('✅ Payment successful - User granted instant access:', userId);
}

async function handleSubscriptionCreate(supabase: any, event: PaystackEvent) {
  const userId = event.data.metadata?.user_id;
  if (!userId) return;

  const subscriptionCode = event.data.subscription?.subscription_code;

  await supabase.from('billing_profiles').update({
    plan: 'business',
    subscription_status: 'active',
    paystack_subscription_id: subscriptionCode,
    paystack_customer_id: event.data.customer.customer_code,
  }).eq('id', userId);

  console.log('✅ Subscription created:', userId);
}

async function handleSubscriptionDisable(supabase: any, event: PaystackEvent) {
  const userId = event.data.metadata?.user_id;
  if (!userId) return;

  await supabase.from('billing_profiles').update({
    subscription_status: 'cancelled',
  }).eq('id', userId);

  console.log('❌ Subscription cancelled:', userId);
}

async function handlePaymentFailed(supabase: any, event: PaystackEvent) {
  const userId = event.data.metadata?.user_id;
  if (!userId) return;

  // Record failed transaction
  await supabase.from('transactions').insert({
    user_id: userId,
    amount: event.data.amount,
    currency: event.data.currency,
    status: 'failed',
    paystack_reference: event.data.reference,
    description: 'Failed Payment Attempt',
    created_at: new Date().toISOString(),
  });

  // Update billing profile
  await supabase.from('billing_profiles').update({
    subscription_status: 'failed',
  }).eq('id', userId);

  console.log('❌ Payment failed:', userId);
}
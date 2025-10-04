// src/pages/api/paystack-webhook.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import crypto from 'https://deno.land/std@0.168.0/node/crypto.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
export const handler = async (event, context)=>{
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: 'Method not allowed'
      })
    };
  }
  try {
    // Verify signature
    const hash = crypto.createHmac('sha512', paystackSecretKey).update(event.body).digest('hex');
    const paystackSignature = event.headers['x-paystack-signature'];
    if (hash !== paystackSignature) {
      console.error('Invalid Paystack signature');
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: 'Invalid signature'
        })
      };
    }
    const webhookEvent = JSON.parse(event.body);
    console.log('Paystack webhook received:', webhookEvent.event, webhookEvent.data?.reference);
    switch(webhookEvent.event){
      case 'charge.success':
        await handleChargeSuccess(webhookEvent);
        break;
      case 'subscription.create':
      case 'subscription.enable':
        await handleSubscriptionCreate(webhookEvent);
        break;
      case 'subscription.disable':
      case 'subscription.cancelled':
      case 'subscription.not_renew':
        await handleSubscriptionDisable(webhookEvent);
        break;
      case 'invoice.create':
      case 'invoice.update':
      case 'invoice.payment_succeeded':
        await handleInvoiceEvent(webhookEvent);
        break;
      default:
        console.log('Unhandled event type:', webhookEvent.event);
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Webhook processed successfully'
      })
    };
  } catch (error) {
    console.error('Webhook processing error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error'
      })
    };
  }
};
async function handleChargeSuccess(event) {
  const data = event.data;
  const { data: profile, error: profileError } = await supabase.from('profiles').select('id').eq('email', data.customer.email).single();
  if (profileError || !profile) {
    console.error('User not found:', data.customer.email);
    await logFailedWebhook(event, profileError?.message);
    return;
  }
  // Idempotent transaction insert
  await supabase.from('transactions').upsert({
    user_id: profile.id,
    amount: data.amount,
    currency: data.currency,
    status: 'success',
    description: 'Subscription payment',
    paystack_reference: data.reference
  }, {
    onConflict: [
      'paystack_reference'
    ]
  });
  // Activate subscription if exists
  if (data.subscription) {
    const nextBillingDate = new Date(data.subscription.next_payment_date);
    await supabase.from('billing_profiles').upsert({
      id: profile.id,
      plan: 'business',
      subscription_status: 'active',
      paystack_customer_id: data.customer.customer_code,
      paystack_subscription_id: data.subscription.subscription_code,
      next_billing_date: nextBillingDate.toISOString(),
      updated_at: new Date().toISOString()
    });
    await supabase.from('profiles').update({
      subscribed: true,
      subscription_status: 'active',
      subscription_id: data.subscription.subscription_code,
      subscription_next_billing: nextBillingDate.toISOString()
    }).eq('id', profile.id);
    console.log('Subscription activated for user:', data.customer.email);
  }
}
async function handleSubscriptionCreate(event) {
  const data = event.data;
  const { data: profile, error: profileError } = await supabase.from('profiles').select('id').eq('email', data.customer.email).single();
  if (profileError || !profile) {
    console.error('User not found:', data.customer.email);
    await logFailedWebhook(event, profileError?.message);
    return;
  }
  const nextBillingDate = data.subscription?.next_payment_date ? new Date(data.subscription.next_payment_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await supabase.from('billing_profiles').upsert({
    id: profile.id,
    plan: 'business',
    subscription_status: 'active',
    paystack_customer_id: data.customer.customer_code,
    paystack_subscription_id: data.subscription?.subscription_code || '',
    next_billing_date: nextBillingDate.toISOString(),
    updated_at: new Date().toISOString()
  });
  await supabase.from('profiles').update({
    subscribed: true,
    subscription_status: 'active',
    subscription_id: data.subscription?.subscription_code || '',
    subscription_next_billing: nextBillingDate.toISOString()
  }).eq('id', profile.id);
  console.log('Subscription created for user:', data.customer.email);
}
async function handleSubscriptionDisable(event) {
  const data = event.data;
  let userId = null;
  if (data.subscription?.subscription_code) {
    const { data: billingProfile } = await supabase.from('billing_profiles').select('id').eq('paystack_subscription_id', data.subscription.subscription_code).single();
    userId = billingProfile?.id || null;
  }
  if (!userId) {
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', data.customer.email).single();
    userId = profile?.id || null;
  }
  if (!userId) {
    console.error('User not found for subscription disable');
    await logFailedWebhook(event, 'User not found');
    return;
  }
  await supabase.from('billing_profiles').update({
    subscription_status: 'expired',
    updated_at: new Date().toISOString()
  }).eq('id', userId);
  await supabase.from('profiles').update({
    subscribed: false,
    subscription_status: 'expired'
  }).eq('id', userId);
  console.log('Subscription disabled for user:', data.customer.email);
}
async function handleInvoiceEvent(event) {
  const data = event.data;
  const { data: profile } = await supabase.from('profiles').select('id').eq('email', data.customer.email).single();
  if (!profile) {
    console.error('User not found for invoice event:', data.customer.email);
    await logFailedWebhook(event, 'User not found for invoice');
    return;
  }
  if (data.status === 'success' || data.status === 'paid') {
    await supabase.from('transactions').upsert({
      user_id: profile.id,
      amount: data.amount,
      currency: data.currency,
      status: 'success',
      description: 'Invoice payment',
      paystack_reference: data.reference
    }, {
      onConflict: [
        'paystack_reference'
      ]
    });
  }
  console.log('Invoice event processed for user:', data.customer.email);
}
async function logFailedWebhook(event, reason) {
  await supabase.from('webhook_failures').insert({
    event: event.event,
    payload: event.data,
    reason,
    created_at: new Date().toISOString()
  });
}

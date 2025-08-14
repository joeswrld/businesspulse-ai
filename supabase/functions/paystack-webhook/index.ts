import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Verify Paystack webhook signature
async function verifySignature(req: Request, rawBody: Uint8Array): Promise<boolean> {
  try {
    const signature = req.headers.get('x-paystack-signature');
    if (!signature) {
      console.error('❌ Missing Paystack signature header');
      return false;
    }

    // Create HMAC hash
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(PAYSTACK_SECRET),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const signed = await crypto.subtle.sign('HMAC', key, rawBody);
    const hash = Array.from(new Uint8Array(signed))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const isValid = hash === signature;
    
    if (!isValid) {
      console.error('❌ Invalid signature:', { expected: signature, calculated: hash });
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const rawBody = new Uint8Array(await req.arrayBuffer());

    // Verify webhook signature
    const isValidSignature = await verifySignature(req, rawBody);
    if (!isValidSignature) {
      console.error('❌ Invalid webhook signature');
      return new Response('Invalid signature', { status: 401 });
    }

    // Parse webhook payload
    const payload = JSON.parse(new TextDecoder().decode(rawBody));
    const { event, data } = payload;

    console.log(`📡 Paystack webhook received: ${event}`, { reference: data?.reference });

    // Log webhook event for audit
    await supabase
      .from('webhook_events')
      .insert({
        provider: 'paystack',
        event: event,
        payload: payload,
        processed: false
      });

    // Handle different webhook events
    switch (event) {
      case 'charge.success':
        await handleChargeSuccess(supabase, data);
        break;
      
      case 'charge.failed':
        await handleChargeFailed(supabase, data);
        break;
      
      case 'subscription.disable':
        await handleSubscriptionDisable(supabase, data);
        break;
      
      case 'subscription.enable':
        await handleSubscriptionEnable(supabase, data);
        break;
      
      default:
        console.log(`ℹ️ Unhandled webhook event: ${event}`);
    }

    // Mark webhook as processed
    await supabase
      .from('webhook_events')
      .update({ processed: true })
      .eq('provider', 'paystack')
      .eq('event', event)
      .eq('received_at', new Date().toISOString());

    console.log(`✅ Webhook ${event} processed successfully`);

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});

// Handle successful charge
async function handleChargeSuccess(supabase: any, data: any) {
  try {
    const { reference, metadata, amount, currency } = data;
    const user_id = metadata?.user_id;
    const plan_code = metadata?.plan_code;

    if (!user_id || !plan_code) {
      console.error('❌ Missing metadata in charge.success:', metadata);
      return;
    }

    console.log(`💰 Processing successful charge for user ${user_id}, plan ${plan_code}`);

    // Update transaction status
    const { error: txError } = await supabase
      .from('transactions')
      .update({
        status: 'success',
        paid_at: new Date().toISOString(),
        metadata: {
          ...data,
          processed_at: new Date().toISOString()
        }
      })
      .eq('reference', reference);

    if (txError) {
      console.error('❌ Failed to update transaction:', txError);
      return;
    }

    // Calculate next billing period
    const now = new Date();
    const nextPeriodEnd = new Date(now);
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

    // Update subscription to active
    const { error: subError } = await supabase
      .from('subscriptions')
      .update({
        plan_code: plan_code,
        status: 'active',
        trial_end: null, // End trial
        current_period_start: now.toISOString(),
        current_period_end: nextPeriodEnd.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('user_id', user_id);

    if (subError) {
      console.error('❌ Failed to update subscription:', subError);
      return;
    }

    console.log(`✅ Subscription activated for user ${user_id}`);

  } catch (error) {
    console.error('❌ Error handling charge.success:', error);
  }
}

// Handle failed charge
async function handleChargeFailed(supabase: any, data: any) {
  try {
    const { reference, metadata } = data;
    const user_id = metadata?.user_id;

    if (!user_id) {
      console.error('❌ Missing user_id in charge.failed');
      return;
    }

    console.log(`❌ Processing failed charge for user ${user_id}`);

    // Update transaction status
    await supabase
      .from('transactions')
      .update({
        status: 'failed',
        metadata: {
          ...data,
          processed_at: new Date().toISOString()
        }
      })
      .eq('reference', reference);

    // Keep subscription as trialing if it exists
    // This allows users to retry payment

    console.log(`✅ Failed charge processed for user ${user_id}`);

  } catch (error) {
    console.error('❌ Error handling charge.failed:', error);
  }
}

// Handle subscription disable
async function handleSubscriptionDisable(supabase: any, data: any) {
  try {
    const { subscription_code, customer } = data;
    const customer_id = customer?.customer_code;

    if (!customer_id) {
      console.error('❌ Missing customer_id in subscription.disable');
      return;
    }

    console.log(`🚫 Processing subscription disable for customer ${customer_id}`);

    // Find and update subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('paystack_customer_id', customer_id);

    if (error) {
      console.error('❌ Failed to update subscription:', error);
      return;
    }

    console.log(`✅ Subscription disabled for customer ${customer_id}`);

  } catch (error) {
    console.error('❌ Error handling subscription.disable:', error);
  }
}

// Handle subscription enable
async function handleSubscriptionEnable(supabase: any, data: any) {
  try {
    const { subscription_code, customer } = data;
    const customer_id = customer?.customer_code;

    if (!customer_id) {
      console.error('❌ Missing customer_id in subscription.enable');
      return;
    }

    console.log(`✅ Processing subscription enable for customer ${customer_id}`);

    // Find and update subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('paystack_customer_id', customer_id);

    if (error) {
      console.error('❌ Failed to update subscription:', error);
      return;
    }

    console.log(`✅ Subscription enabled for customer ${customer_id}`);

  } catch (error) {
    console.error('❌ Error handling subscription.enable:', error);
  }
}
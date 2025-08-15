import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaystackWebhookEvent {
  event: string;
  data: {
    id: string;
    domain: string;
    amount: number;
    currency: string;
    status: string;
    reference: string;
    customer: {
      id: string;
      email: string;
    };
    subscription?: {
      id: string;
      status: string;
      current_period_start: string;
      current_period_end: string;
      plan: {
        id: string;
        name: string;
        amount: number;
        interval: string;
      };
    };
    metadata?: {
      user_id?: string;
      plan_id?: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify webhook signature
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();
    
    if (!signature) {
      throw new Error('Missing Paystack signature');
    }

    // Verify webhook signature
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!secret) {
      throw new Error('PAYSTACK_SECRET_KEY not configured');
    }

    const hash = createHmac('sha512', secret).update(body).toString('hex');
    if (hash !== signature) {
      throw new Error('Invalid webhook signature');
    }

    const event: PaystackWebhookEvent = JSON.parse(body);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store webhook event
    await supabase
      .from('paystack_webhooks')
      .insert({
        event_type: event.event,
        event_data: event.data
      });

    // Handle different webhook events
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data, supabase);
        break;
      
      case 'subscription.create':
        await handleSubscriptionCreate(event.data, supabase);
        break;
      
      case 'subscription.update':
        await handleSubscriptionUpdate(event.data, supabase);
        break;
      
      case 'subscription.disable':
        await handleSubscriptionDisable(event.data, supabase);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data, supabase);
        break;
      
      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function handleChargeSuccess(data: any, supabase: any) {
  // Handle successful charge
  if (data.metadata?.user_id && data.metadata?.plan_id) {
    const userId = data.metadata.user_id;
    const planId = data.metadata.plan_id;

    // Update user subscription
    await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        plan_id: planId,
        paystack_subscription_id: data.subscription?.id,
        status: 'active',
        current_period_start: data.subscription?.current_period_start,
        current_period_end: data.subscription?.current_period_end
      });

    // Update user profile plan
    await supabase
      .from('profiles')
      .update({ plan: data.subscription?.plan?.name?.toLowerCase() })
      .eq('user_id', userId);
  }
}

async function handleSubscriptionCreate(data: any, supabase: any) {
  if (data.metadata?.user_id && data.metadata?.plan_id) {
    const userId = data.metadata.user_id;
    const planId = data.metadata.plan_id;

    // Create new subscription
    await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        paystack_subscription_id: data.subscription?.id,
        status: 'active',
        current_period_start: data.subscription?.current_period_start,
        current_period_end: data.subscription?.current_period_end
      });

    // Update user profile
    await supabase
      .from('profiles')
      .update({ plan: data.subscription?.plan?.name?.toLowerCase() })
      .eq('user_id', userId);
  }
}

async function handleSubscriptionUpdate(data: any, supabase: any) {
  if (data.subscription?.id) {
    // Update existing subscription
    await supabase
      .from('user_subscriptions')
      .update({
        status: data.subscription.status,
        current_period_start: data.subscription.current_period_start,
        current_period_end: data.subscription.current_period_end
      })
      .eq('paystack_subscription_id', data.subscription.id);

    // Update user profile if plan changed
    if (data.metadata?.user_id) {
      await supabase
        .from('profiles')
        .update({ plan: data.subscription.plan?.name?.toLowerCase() })
        .eq('user_id', data.metadata.user_id);
    }
  }
}

async function handleSubscriptionDisable(data: any, supabase: any) {
  if (data.subscription?.id) {
    // Disable subscription
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        current_period_end: data.subscription.current_period_end
      })
      .eq('paystack_subscription_id', data.subscription.id);

    // Update user profile to free plan
    if (data.metadata?.user_id) {
      await supabase
        .from('profiles')
        .update({ plan: 'free' })
        .eq('user_id', data.metadata.user_id);
    }
  }
}

async function handlePaymentFailed(data: any, supabase: any) {
  if (data.subscription?.id) {
    // Mark subscription as past due
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'past_due'
      })
      .eq('paystack_subscription_id', data.subscription.id);

    // Send notification to user (implement notification system)
    if (data.metadata?.user_id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: data.metadata.user_id,
          title: 'Payment Failed',
          message: 'Your subscription payment failed. Please update your payment method to continue using premium features.',
          type: 'billing_alert'
        });
    }
  }
}
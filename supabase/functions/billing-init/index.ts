import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { user_id, plan_code, currency } = await req.json();

    if (!user_id || !plan_code) {
      return new Response('Missing user_id or plan_code', { status: 400 });
    }

    console.log(`🚀 Initializing checkout for user ${user_id}, plan ${plan_code}`);

    // Load plan details
    const { data: plan, error: planErr } = await supabase
      .from('plans')
      .select('*')
      .eq('code', plan_code)
      .eq('is_active', true)
      .single();

    if (planErr || !plan) {
      console.error('❌ Plan not found:', planErr);
      return new Response('Plan not found', { status: 400 });
    }

    // Get user profile for email
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user_id)
      .single();

    if (profileErr) {
      console.error('❌ Profile not found:', profileErr);
      return new Response('User profile not found', { status: 400 });
    }

    // Generate unique reference
    const reference = crypto.randomUUID();
    const amount = plan.price_cents;
    const selectedCurrency = currency || plan.currency;

    console.log(`💰 Creating Paystack transaction: ${amount} ${selectedCurrency} for plan ${plan_code}`);

    // Initialize Paystack transaction
    const initResp = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: profile.email || `user-${user_id}@notex.local`,
        amount: amount,
        currency: selectedCurrency,
        reference: reference,
        metadata: {
          user_id,
          plan_code,
          user_name: profile.full_name || 'NoteX User'
        },
        callback_url: `${Deno.env.get('SITE_URL') || 'https://notex.ai'}/billing/success?reference=${reference}`,
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
      })
    });

    const initJson = await initResp.json();
    
    if (!initResp.ok || !initJson?.data?.authorization_url) {
      console.error('❌ Paystack initialization failed:', initJson);
      return new Response(JSON.stringify({
        error: 'Payment initialization failed',
        details: initJson
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Paystack transaction initialized: ${reference}`);

    // Create transaction record in Supabase
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id,
        reference,
        amount_cents: amount,
        currency: selectedCurrency,
        status: 'pending',
        authorization_url: initJson.data.authorization_url,
        metadata: {
          plan_code,
          plan_name: plan.name,
          paystack_data: initJson.data
        }
      });

    if (txError) {
      console.error('❌ Failed to create transaction record:', txError);
      return new Response('Failed to create transaction record', { status: 500 });
    }

    // Update user's subscription status to pending
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id,
        plan_code,
        status: 'trialing', // Keep as trialing until payment succeeds
        current_period_start: new Date().toISOString(),
        current_period_end: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (subError) {
      console.error('❌ Failed to update subscription:', subError);
      // Don't fail the request, just log it
    }

    console.log(`🎯 Checkout ready for user ${user_id}`);

    return new Response(JSON.stringify({
      success: true,
      authorization_url: initJson.data.authorization_url,
      reference: reference,
      amount: amount,
      currency: selectedCurrency,
      plan_name: plan.name
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Billing init error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();
    
    // Verify signature
    const hash = await crypto.subtle.digest(
      'SHA-512',
      new TextEncoder().encode(Deno.env.get('PAYSTACK_SECRET_KEY')! + body)
    );
    const expectedSignature = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (signature !== expectedSignature) {
      console.error('Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(body);
    console.log('✅ Webhook received:', event.event);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Handle charge.success - This is the critical event
    if (event.event === 'charge.success') {
      const { data: eventData } = event;
      
      // Extract user_id from metadata
      const userId = eventData.metadata?.user_id;
      
      if (!userId) {
        console.error('❌ No user_id in payment metadata');
        return new Response(JSON.stringify({ error: 'No user_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('💳 Processing payment for user:', userId);

      // CRITICAL: Update billing profile to grant access
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + 30); // 30 days from now

      const { data: updateData, error: updateError } = await supabase
        .from('billing_profiles')
        .update({
          plan: 'business',
          subscription_status: 'active',
          next_billing_date: nextBillingDate.toISOString(),
          paystack_customer_id: eventData.customer?.customer_code || null,
          trial_ends_at: null, // Clear trial date - user is now paid
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select();

      if (updateError) {
        console.error('❌ Failed to update billing profile:', updateError);
        throw updateError;
      }

      console.log('✅ Billing profile updated:', updateData);

      // Record the transaction
      await supabase.from('transactions').insert({
        user_id: userId,
        amount: eventData.amount,
        currency: eventData.currency || 'NGN',
        status: 'success',
        paystack_reference: eventData.reference,
        description: 'Business Plan Subscription',
        created_at: new Date().toISOString(),
      });

      console.log('✅ Transaction recorded');
      console.log('🎉 USER GRANTED INSTANT ACCESS:', userId);

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Payment processed successfully',
        userId,
        plan: 'business',
        status: 'active'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Handle other events...
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
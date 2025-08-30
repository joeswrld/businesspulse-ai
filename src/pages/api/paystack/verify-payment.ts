import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reference, plan, amount, email } = req.body;

    if (!reference || !plan || !amount || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify payment with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || paystackData.status === false) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const transaction = paystackData.data;

    // Check if payment was successful
    if (transaction.status !== 'success') {
      return res.status(400).json({ error: 'Payment was not successful' });
    }

    // Check if amount matches
    if (transaction.amount !== amount) {
      return res.status(400).json({ error: 'Amount mismatch' });
    }

    // Get user by email
    const { data: user, error: userError } = await supabase.auth.admin.getUserByEmail(email);
    
    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create or update billing profile
    const { error: billingError } = await supabase
      .from('billing_profiles')
      .upsert({
        id: user.user.id,
        plan: plan,
        trial_ends_at: null,
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        subscription_status: 'active',
        paystack_customer_id: transaction.customer?.customer_code || null,
        paystack_subscription_id: null, // Will be set when subscription is created
        created_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (billingError) {
      console.error('Billing profile update error:', billingError);
      return res.status(500).json({ error: 'Failed to update billing profile' });
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.user.id,
        amount: amount,
        currency: 'NGN',
        status: 'success',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Subscription`,
        paystack_reference: reference,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('Transaction record error:', transactionError);
      return res.status(500).json({ error: 'Failed to record transaction' });
    }

    // Update user subscription
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: user.user.id,
        plan_code: plan,
        plan_name: plan === 'pro' ? 'Pro Plan' : 'Business Plan',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        canceled_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (subscriptionError) {
      console.error('Subscription update error:', subscriptionError);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }

    // Log successful upgrade
    console.log(`User ${user.user.id} upgraded to ${plan} plan successfully`);

    return res.status(200).json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        user_id: user.user.id,
        plan: plan,
        reference: reference,
        amount: amount
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
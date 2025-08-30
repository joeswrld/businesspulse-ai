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
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' });
    }

    // Get the user from the session
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get current billing profile
    const { data: billingProfile, error: profileError } = await supabase
      .from('billing_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !billingProfile) {
      return res.status(404).json({ error: 'Billing profile not found' });
    }

    // Reactivate subscription with Paystack
    if (billingProfile.paystack_subscription_id) {
      try {
        const paystackResponse = await fetch(`https://api.paystack.co/subscription/enable`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: billingProfile.paystack_subscription_id,
            token: subscriptionId
          }),
        });

        if (!paystackResponse.ok) {
          console.error('Paystack subscription reactivation failed');
        }
      } catch (error) {
        console.error('Error reactivating Paystack subscription:', error);
      }
    }

    // Update billing profile
    const { error: updateError } = await supabase
      .from('billing_profiles')
      .update({
        subscription_status: 'active',
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Billing profile update error:', updateError);
      return res.status(500).json({ error: 'Failed to update billing profile' });
    }

    // Update user subscription
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: null,
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (subscriptionError) {
      console.error('Subscription update error:', subscriptionError);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }

    // Log reactivation
    console.log(`User ${user.id} reactivated their subscription`);

    return res.status(200).json({
      success: true,
      message: 'Subscription reactivated successfully',
      data: {
        user_id: user.id,
        reactivated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Subscription reactivation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
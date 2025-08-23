import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' });
    }

    // Get subscription details
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single();

    if (subscriptionError || !subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Cancel subscription in Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/subscription/disable`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: subscription.paystack_subscription_code,
          token: subscription.paystack_token,
        }),
      }
    );

    if (!paystackResponse.ok) {
      const paystackError = await paystackResponse.json();
      console.error('Paystack error:', paystackError);
      return res.status(500).json({ error: 'Failed to cancel subscription with payment provider' });
    }

    // Update subscription status in database
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return res.status(500).json({ error: 'Failed to update subscription status' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Subscription cancelled successfully' 
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
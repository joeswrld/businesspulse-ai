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

    // Get user's subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subscriptionError || !subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Generate Paystack update link
    const paystackResponse = await fetch(
      'https://api.paystack.co/subscription/manage/link',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: subscription.paystack_subscription_code,
          email: user.email,
        }),
      }
    );

    if (!paystackResponse.ok) {
      const paystackError = await paystackResponse.json();
      console.error('Paystack error:', paystackError);
      return res.status(500).json({ error: 'Failed to generate update link' });
    }

    const paystackData = await paystackResponse.json();

    if (!paystackData.data?.link) {
      return res.status(500).json({ error: 'No update link received from payment provider' });
    }

    return res.status(200).json({ 
      success: true, 
      url: paystackData.data.link 
    });

  } catch (error) {
    console.error('Update card error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
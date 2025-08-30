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
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
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

    // Get user email
    const userEmail = user.email || 'user@example.com';

    // Create Paystack update URL
    const paystackResponse = await fetch('https://api.paystack.co/customer/update_authorization', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: customerId,
        email: userEmail,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?updated=true`
      }),
    });

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json();
      console.error('Paystack API error:', errorData);
      return res.status(400).json({ error: 'Failed to generate update URL' });
    }

    const paystackData = await paystackResponse.json();

    if (!paystackData.data?.authorization_url) {
      return res.status(400).json({ error: 'No update URL received from Paystack' });
    }

    return res.status(200).json({
      success: true,
      message: 'Update URL generated successfully',
      url: paystackData.data.authorization_url
    });

  } catch (error) {
    console.error('Payment method update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
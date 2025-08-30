import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' });
    }

    // Get user from session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Call Paystack API to disable subscription
    const paystackResponse = await fetch(`https://api.paystack.co/subscription/disable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: subscriptionId,
        token: 'disable_token' // This will disable the subscription
      }),
    });

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json();
      console.error('Paystack API error:', errorData);
      return res.status(400).json({ error: 'Failed to cancel subscription with Paystack' });
    }

    const paystackData = await paystackResponse.json();

    // Update billing profile in Supabase
    const { error: updateError } = await supabase
      .from('billing_profiles')
      .update({
        plan: 'free',
        subscription_status: 'cancelled',
        next_billing_date: null
      })
      .eq('paystack_subscription_id', subscriptionId)
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Error updating billing profile:', updateError);
      return res.status(500).json({ error: 'Failed to update billing profile' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Subscription cancelled successfully',
      data: paystackData 
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Paystack configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface CancelSubscriptionRequest {
  subscriptionId: string;
}

interface CancelSubscriptionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CancelSubscriptionResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`[${new Date().toISOString()}] Method not allowed: ${req.method}`);
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    console.log(`[${new Date().toISOString()}] Processing cancel subscription request`);

    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`[${new Date().toISOString()}] Missing or invalid authorization header`);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Missing or invalid token'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log(`[${new Date().toISOString()}] Authentication failed:`, authError?.message);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid token'
      });
    }

    console.log(`[${new Date().toISOString()}] Authenticated user: ${user.id}`);

    // Parse request body
    const { subscriptionId }: CancelSubscriptionRequest = req.body;

    if (!subscriptionId) {
      console.log(`[${new Date().toISOString()}] Missing subscriptionId in request body`);
      return res.status(400).json({
        success: false,
        error: 'Missing subscriptionId'
      });
    }

    // Get subscription details from Supabase
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single();

    if (subscriptionError || !subscription) {
      console.log(`[${new Date().toISOString()}] Subscription not found:`, subscriptionError?.message);
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    console.log(`[${new Date().toISOString()}] Found subscription: ${subscription.id}, status: ${subscription.status}`);

    // Check if subscription is already cancelled
    if (subscription.status === 'cancelled') {
      console.log(`[${new Date().toISOString()}] Subscription already cancelled`);
      return res.status(400).json({
        success: false,
        error: 'Subscription is already cancelled'
      });
    }

    // Check if subscription has Paystack subscription code
    if (!subscription.paystack_subscription_code) {
      console.log(`[${new Date().toISOString()}] No Paystack subscription code found`);
      return res.status(400).json({
        success: false,
        error: 'No Paystack subscription found'
      });
    }

    // Call Paystack API to disable subscription
    console.log(`[${new Date().toISOString()}] Calling Paystack API to disable subscription: ${subscription.paystack_subscription_code}`);
    
    const paystackResponse = await fetch(`${PAYSTACK_BASE_URL}/subscription/disable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: subscription.paystack_subscription_code,
        token: subscription.paystack_token
      }),
    });

    const paystackResult = await paystackResponse.json();

    if (!paystackResponse.ok) {
      console.log(`[${new Date().toISOString()}] Paystack API error:`, paystackResult);
      return res.status(500).json({
        success: false,
        error: `Paystack API error: ${paystackResult.message || 'Failed to cancel subscription'}`
      });
    }

    console.log(`[${new Date().toISOString()}] Paystack subscription disabled successfully`);

    // Update subscription status in Supabase
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        cancelled_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.log(`[${new Date().toISOString()}] Failed to update subscription in database:`, updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update subscription status'
      });
    }

    console.log(`[${new Date().toISOString()}] Subscription cancelled successfully for user: ${user.id}`);

    return res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully'
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unexpected error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
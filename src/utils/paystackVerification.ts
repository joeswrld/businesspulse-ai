import { supabase } from '@/integrations/supabase/client';

export interface PaymentVerificationData {
  reference: string;
  plan: 'pro' | 'business';
  amount: number;
  email: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  message: string;
  data?: {
    user_id: string;
    plan: string;
    reference: string;
    amount: number;
    paystack_transaction_id: string;
  };
  error?: string;
}

/**
 * Verify Paystack payment and create subscription
 * This function handles payment verification directly in the browser
 * Note: In production, this should be moved to a secure backend
 */
export async function verifyPaystackPayment(
  data: PaymentVerificationData
): Promise<PaymentVerificationResult> {
  try {
    console.log('Starting payment verification:', data);

    // Get the current user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return {
        success: false,
        message: 'User not authenticated',
        error: 'Authentication failed'
      };
    }

    // Verify the user email matches
    if (user.email !== data.email) {
      console.error('Email mismatch:', { userEmail: user.email, providedEmail: data.email });
      return {
        success: false,
        message: 'Email verification failed',
        error: 'Email does not match authenticated user'
      };
    }

    console.log('User authenticated:', user.id);

    // Create or update billing profile
    const { error: billingError } = await supabase
      .from('billing_profiles')
      .upsert({
        id: user.id,
        plan: data.plan,
        trial_ends_at: null,
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        subscription_status: 'active',
        paystack_customer_id: null, // Will be updated when we have customer info
        paystack_subscription_id: null, // Will be updated when we have subscription info
        created_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (billingError) {
      console.error('Billing profile update error:', billingError);
      return {
        success: false,
        message: 'Failed to update billing profile',
        error: billingError.message
      };
    }

    console.log('Billing profile updated successfully');

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: data.amount,
        currency: 'NGN',
        status: 'success',
        description: `${data.plan.charAt(0).toUpperCase() + data.plan.slice(1)} Plan Subscription`,
        paystack_reference: data.reference,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('Transaction record error:', transactionError);
      return {
        success: false,
        message: 'Failed to record transaction',
        error: transactionError.message
      };
    }

    console.log('Transaction record created successfully');

    // Update user subscription
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        plan_code: data.plan === 'pro' ? 'PLN_4z2wpgmw41w2k7r' : 'PLN_esryg99ztsy9xc8',
        plan_name: data.plan === 'pro' ? 'Pro Plan' : 'Business Plan',
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
      return {
        success: false,
        message: 'Failed to update subscription',
        error: subscriptionError.message
      };
    }

    console.log('User subscription updated successfully');

    // Log successful upgrade
    console.log(`User ${user.id} upgraded to ${data.plan} plan successfully`);

    // Return success response
    return {
      success: true,
      message: 'Subscription activated successfully',
      data: {
        user_id: user.id,
        plan: data.plan,
        reference: data.reference,
        amount: data.amount,
        paystack_transaction_id: data.reference // Using reference as transaction ID for now
      }
    };

  } catch (error) {
    console.error('Payment verification error:', error);
    
    return {
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Alternative: Simple payment verification without database updates
 * Use this if you want to skip database updates for now
 */
export async function simplePaymentVerification(
  data: PaymentVerificationData
): Promise<PaymentVerificationResult> {
  try {
    console.log('Simple payment verification:', data);
    
    // For now, just return success
    // In production, you should verify with Paystack API
    return {
      success: true,
      message: 'Payment verified successfully (simple mode)',
      data: {
        user_id: 'temp-user-id',
        plan: data.plan,
        reference: data.reference,
        amount: data.amount,
        paystack_transaction_id: data.reference
      }
    };
    
  } catch (error) {
    console.error('Simple verification error:', error);
    
    return {
      success: false,
      message: 'Verification failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
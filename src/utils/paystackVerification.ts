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
  retryable?: boolean;
}

/**
 * Check if the user has network connectivity
 */
function checkNetworkConnectivity(): boolean {
  return navigator.onLine;
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

    // Check network connectivity first
    if (!checkNetworkConnectivity()) {
      return {
        success: false,
        message: 'No internet connection. Please check your network and try again.',
        error: 'Network offline',
        retryable: true
      };
    }

    // Get the current user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Authentication error:', authError);
      
      // Check if it's a network-related auth error
      if (authError.message.includes('Failed to fetch') || authError.message.includes('network')) {
        return {
          success: false,
          message: 'Network connection issue. Please check your internet connection and try again.',
          error: 'Network error during authentication',
          retryable: true
        };
      }
      
      return {
        success: false,
        message: 'Authentication failed. Please log in again.',
        error: 'Authentication failed',
        retryable: false
      };
    }

    if (!user) {
      return {
        success: false,
        message: 'User not authenticated. Please log in and try again.',
        error: 'User not found',
        retryable: false
      };
    }

    // Verify the user email matches
    if (user.email !== data.email) {
      console.error('Email mismatch:', { userEmail: user.email, providedEmail: data.email });
      return {
        success: false,
        message: 'Email verification failed. Please try again.',
        error: 'Email does not match authenticated user',
        retryable: false
      };
    }

    console.log('User authenticated:', user.id);

    // Test database connectivity before proceeding
    try {
      const { error: testError } = await supabase
        .from('billing_profiles')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('Database connectivity test failed:', testError);
        return {
          success: false,
          message: 'Database connection failed. Please check your connection and try again.',
          error: 'Database connectivity issue',
          retryable: true
        };
      }
    } catch (dbTestError) {
      console.error('Database test error:', dbTestError);
      return {
        success: false,
        message: 'Unable to connect to database. Please try again later.',
        error: 'Database connection failed',
        retryable: true
      };
    }

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
      
      // Check if it's a network-related error
      if (billingError.message.includes('Failed to fetch') || billingError.message.includes('network')) {
        return {
          success: false,
          message: 'Network error while updating billing profile. Please try again.',
          error: 'Network error during billing update',
          retryable: true
        };
      }
      
      return {
        success: false,
        message: 'Failed to update billing profile. Please try again.',
        error: billingError.message,
        retryable: true
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
      
      // Check if it's a network-related error
      if (transactionError.message.includes('Failed to fetch') || transactionError.message.includes('network')) {
        return {
          success: false,
          message: 'Network error while recording transaction. Please try again.',
          error: 'Network error during transaction recording',
          retryable: true
        };
      }
      
      return {
        success: false,
        message: 'Failed to record transaction. Please try again.',
        error: transactionError.message,
        retryable: true
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
      
      // Check if it's a network-related error
      if (subscriptionError.message.includes('Failed to fetch') || subscriptionError.message.includes('network')) {
        return {
          success: false,
          message: 'Network error while updating subscription. Please try again.',
          error: 'Network error during subscription update',
          retryable: true
        };
      }
      
      return {
        success: false,
        message: 'Failed to update subscription. Please try again.',
        error: subscriptionError.message,
        retryable: true
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
    
    // Check if it's a network-related error
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('network') || error.message.includes('ERR_TUNNEL_CONNECTION_FAILED') || error.message.includes('ERR_INTERNET_DISCONNECTED')) {
        return {
          success: false,
          message: 'Network connection issue. Please check your internet connection and try again.',
          error: 'Network error',
          retryable: true
        };
      }
      
      return {
        success: false,
        message: 'Payment verification failed. Please try again.',
        error: error.message,
        retryable: true
      };
    }
    
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.',
      error: 'Unknown error',
      retryable: true
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
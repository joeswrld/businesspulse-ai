import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PaystackConfig {
  key: string;
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callback: (response: any) => void;
  onClose: () => void;
}

export interface PaystackActions {
  initializePayment: (config: Omit<PaystackConfig, 'key' | 'callback' | 'onClose'>) => Promise<void>;
  verifyPayment: (reference: string, plan: string, amount: number) => Promise<boolean>;
  isPaystackReady: boolean;
  loading: boolean;
  error: string | null;
}

export function usePaystack(): PaystackActions {
  const { user } = useAuth();
  const [isPaystackReady, setIsPaystackReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Paystack script
  const initializePaystack = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (window.PaystackPop && typeof window.PaystackPop.setup === 'function') {
        setIsPaystackReady(true);
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        setTimeout(() => {
          if (window.PaystackPop && typeof window.PaystackPop.setup === 'function') {
            setIsPaystackReady(true);
            resolve();
          } else {
            reject(new Error('Paystack script loaded but not properly initialized'));
          }
        }, 500);
      };
      script.onerror = () => {
        reject(new Error('Failed to load Paystack script'));
      };
      document.head.appendChild(script);
    });
  }, []);

  // Verify payment with backend
  const verifyPayment = useCallback(async (reference: string, plan: string, amount: number): Promise<boolean> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Get Supabase session for authorization
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Verify payment via Supabase Edge Function
      const verifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`;
      
      const requestBody = {
        reference,
        plan,
        amount,
        email: user.email,
      };
      
      console.log('Sending payment verification request:', {
        url: verifyUrl,
        body: requestBody,
        hasAuthToken: !!session.access_token,
      });
      
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let error;
        try {
          const errorText = await response.text();
          if (errorText) {
            error = JSON.parse(errorText);
          } else {
            error = { message: 'Empty response from server' };
          }
        } catch (parseError) {
          error = { message: 'Failed to parse server response' };
        }
        
        console.error('Payment verification failed:', {
          status: response.status,
          statusText: response.statusText,
          error: error,
        });
        
        const errorMessage = error.details || error.message || 'Failed to create subscription';
        throw new Error(`Payment verification failed: ${errorMessage}`);
      }

      let result;
      try {
        const responseText = await response.text();
        if (!responseText) {
          throw new Error('Empty response from server');
        }
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Failed to parse server response');
      }

      if (result.success) {
        console.log('Payment verification successful:', result);
        toast.success(`🎉 Welcome to Business! Your subscription has been activated.`);
        setLoading(false);
        return true;
      } else {
        console.error('Payment verification failed - success=false:', result);
        throw new Error(result.message || 'Failed to update subscription');
      }
    } catch (err) {
      console.error('Payment verification error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment verification failed';
      setError(errorMessage);
      setLoading(false);
      
      // Show specific error messages
      if (errorMessage.includes('Authentication required')) {
        toast.error('Please log in again to complete your payment.');
      } else if (errorMessage.includes('Amount mismatch')) {
        toast.error('Payment amount verification failed. Please try again.');
      } else if (errorMessage.includes('Payment verification failed')) {
        toast.error('Payment verification failed. Please check your payment and try again.');
      } else {
        toast.error(`Payment verification failed: ${errorMessage}`);
      }
      
      return false;
    }
  }, [user]);

  // Initialize payment
  const initializePayment = useCallback(async (config: Omit<PaystackConfig, 'key' | 'callback' | 'onClose'>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      // Ensure Paystack is ready
      if (!isPaystackReady) {
        await initializePaystack();
      }

      if (!window.PaystackPop || typeof window.PaystackPop.setup !== 'function') {
        throw new Error('Paystack payment system not properly initialized');
      }

      // Validate Paystack key
      const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (!paystackKey || paystackKey === 'pk_test_...' || paystackKey.includes('your_actual_paystack')) {
        throw new Error('Paystack public key not configured. Please check your environment variables.');
      }

      // Create payment callback
      const paymentCallback = (response: any) => {
        console.log('Paystack response received:', response);
        
        if (response.status === 'success') {
          // Handle success asynchronously
          verifyPayment(response.reference, 'business', config.amount);
        } else {
          setError('Payment was not successful');
          setLoading(false);
        }
      };

      const paystackConfig: PaystackConfig = {
        key: paystackKey,
        email: config.email,
        amount: config.amount,
        currency: config.currency,
        reference: config.reference,
        callback: paymentCallback,
        onClose: () => {
          setLoading(false);
          toast.info('Payment cancelled');
        },
      };

      // Initialize Paystack payment
      const handler = window.PaystackPop.setup(paystackConfig);
      handler.openIframe();
    } catch (err) {
      console.error('Payment initialization error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, [user, isPaystackReady, initializePaystack, verifyPayment]);


  return {
    initializePayment,
    verifyPayment,
    isPaystackReady,
    loading,
    error,
  };
}
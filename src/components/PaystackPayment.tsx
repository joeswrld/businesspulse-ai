import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, CheckCircle, XCircle, ExternalLink, RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { verifyPaystackPayment, simplePaymentVerification } from '@/utils/paystackVerification';

interface PaystackPaymentProps {
  plan: 'pro' | 'business';
  planName: string;
  planPrice: string;
  onSuccess: (data: { reference: string; plan: string }) => void;
  onCancel: () => void;
}

interface PaystackConfig {
  key: string;
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callback: (response: any) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: PaystackConfig) => { openIframe: () => void };
    };
  }
}

const PaystackPayment: React.FC<PaystackPaymentProps> = ({
  plan,
  planName,
  planPrice,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paystackReady, setPaystackReady] = useState(false);
  const [componentError, setComponentError] = useState<string | null>(null);

  // Error boundary for the component
  if (componentError) {
    return (
      <div className="p-6 text-center">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">Component Error</p>
            <p className="text-sm mb-4">{componentError}</p>
            <Button 
              onClick={() => window.location.reload()} 
              size="sm" 
              variant="outline"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reload Page
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Plan pricing in kobo (smallest currency unit)
  const planPricing = {
    pro: 3500000, // ₦35,000 in kobo
    business: 5300000 // ₦53,000 in kobo
  };

  const amount = planPricing[plan];
  const reference = `notex_${plan}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Plan details with actual Paystack plan codes
  const planDetails = {
    pro: {
      name: 'Pro Plan',
      planCode: 'PLN_4z2wpgmw41w2k7r',
      duration: '30 days',
      features: [
        '300 feedback submissions (6x increase)',
        '50 AI insights (10x increase)',
        '100 analytics reports (20x increase)',
        'PDF & Excel export formats',
        'Email + Chat support',
        '12 months data retention'
      ]
    },
    business: {
      name: 'Business Plan',
      planCode: 'PLN_esryg99ztsy9xc8',
      duration: '30 days',
      features: [
        'Unlimited usage across all features',
        'Priority phone support',
        'API access for integrations',
        'Predictive analytics',
        'Custom integrations',
        'Unlimited data retention'
      ]
    }
  };

  // Safe access to plan details
  const currentPlanDetails = planDetails[plan] || planDetails.pro;

  useEffect(() => {
    // Check if Paystack is already loaded
    if (window.PaystackPop && typeof window.PaystackPop.setup === 'function') {
      setPaystackReady(true);
      return;
    }

    // Load Paystack script if not already loaded
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      console.log('Paystack script loaded successfully');
      // Add a delay to ensure the script is fully initialized
      setTimeout(() => {
        if (window.PaystackPop && typeof window.PaystackPop.setup === 'function') {
          setPaystackReady(true);
          console.log('Paystack is now ready');
        } else {
          console.error('Paystack script loaded but not properly initialized');
          setError('Paystack script loaded but not properly initialized');
        }
      }, 500);
    };
    script.onerror = () => {
      console.error('Failed to load Paystack script');
      setError('Failed to load Paystack payment system');
    };
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Retry mechanism for Paystack loading
  const retryPaystackLoad = useCallback(() => {
    console.log('Retrying Paystack load...');
    setError(null);
    setPaystackReady(false);
    
    // Force reload the script
    const existingScript = document.querySelector('script[src*="paystack.co"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      console.log('Paystack script reloaded successfully');
      setTimeout(() => {
        if (window.PaystackPop && typeof window.PaystackPop.setup === 'function') {
          console.log('Paystack is now ready after retry');
          setPaystackReady(true);
        } else {
          console.error('Paystack still not ready after retry');
          setError('Failed to initialize Paystack after retry. Please refresh the page.');
        }
      }, 1500);
    };
    script.onerror = () => {
      console.error('Failed to reload Paystack script');
      setError('Failed to load Paystack payment system. Please check your internet connection.');
    };
    document.head.appendChild(script);
  }, []);
  const handlePaymentSuccess = async (response: any) => {
    try {
      console.log('Processing successful payment:', response);
      
      // Use local verification function instead of Edge Function
      const result = await verifyPaystackPayment({
        reference: response.reference,
        plan: plan,
        amount: amount,
        email: user?.email || 'user@example.com'
      });

      if (result.success) {
        toast.success(`🎉 Welcome to ${planName}! Your subscription has been activated.`);
        onSuccess({ reference: response.reference, plan });
      } else {
        throw new Error(result.error || 'Failed to update subscription');
      }
    } catch (err) {
      console.error('Payment verification error:', err);
      setError(err instanceof Error ? err.message : 'Payment verification failed');
      toast.error('Payment verification failed. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!paystackReady) {
      setError('Paystack payment system is still loading. Please wait a moment and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get user email from auth context
      const userEmail = user?.email || 'user@example.com';
      
      if (!userEmail || userEmail === 'user@example.com') {
        setError('Please log in to proceed with payment');
        setLoading(false);
        return;
      }

      // Ensure Paystack is properly loaded and ready
      if (!window.PaystackPop || typeof window.PaystackPop.setup !== 'function') {
        throw new Error('Paystack payment system not properly initialized. Please refresh and try again.');
      }

      // Create a simpler callback function to avoid async issues
      const paymentCallback = (response: any) => {
        console.log('Paystack response received:', response);
        
        if (response.status === 'success') {
          // Handle success asynchronously
          handlePaymentSuccess(response);
        } else {
          setError('Payment was not successful');
          setLoading(false);
        }
      };

      const config: PaystackConfig = {
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_...',
        email: userEmail,
        amount: amount,
        currency: 'NGN',
        reference: reference,
        // Note: plan parameter is not supported in inline checkout
        // We'll handle subscription creation after successful payment
        callback: paymentCallback,
        onClose: () => {
          setLoading(false);
          toast.info('Payment cancelled');
        }
      };

      // Validate configuration before sending to Paystack
      if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY === 'pk_test_...') {
        throw new Error('Paystack public key not configured. Please check your environment variables.');
      }

      if (!userEmail || userEmail === 'user@example.com') {
        throw new Error('Valid user email is required for payment.');
      }

      if (!amount || amount <= 0) {
        throw new Error('Invalid payment amount.');
      }

      console.log('Setting up Paystack with config:', {
        ...config,
        key: config.key.substring(0, 20) + '...' // Log partial key for security
      });
      
      try {
        const handler = window.PaystackPop.setup(config);
        console.log('Paystack handler created:', handler);
        handler.openIframe();
      } catch (setupError) {
        console.error('Paystack setup error:', setupError);
        throw new Error(`Failed to setup payment: ${setupError.message}`);
      }
    } catch (err) {
      console.error('Payment setup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize payment');
      setLoading(false);
    }
  };

  const formatPrice = (amountInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amountInKobo / 100);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Upgrade to {planName}
          </CardTitle>
          <CardDescription>
            Complete your payment to activate your {planName} subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plan Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Plan:</span>
              <Badge variant="secondary">{currentPlanDetails.name}</Badge>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Duration:</span>
              <span className="text-sm text-gray-600">{currentPlanDetails.duration}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Price:</span>
              <span className="text-lg font-bold">{formatPrice(amount)}/month</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Features:</span>
              <span className="text-sm text-gray-600">{currentPlanDetails.features.length} features</span>
            </div>
          </div>

          {/* Plan Benefits */}
          <div className="space-y-2">
            <h4 className="font-medium">Plan Benefits:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {currentPlanDetails.features.map((feature, index) => (
                <li key={index}>• {feature}</li>
              ))}
            </ul>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <div className="mt-2">
                  <Button 
                    onClick={retryPaystackLoad} 
                    size="sm" 
                    variant="outline"
                    className="mr-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()} 
                    size="sm" 
                    variant="outline"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Refresh Page
                  </Button>
                </div>
                {import.meta.env.DEV && (
                  <div className="mt-2 text-xs">
                    <p>Debug: paystackReady = {paystackReady.toString()}</p>
                    <p>Debug: window.PaystackPop = {window.PaystackPop ? 'exists' : 'missing'}</p>
                    <p>Debug: setup function = {window.PaystackPop?.setup ? 'exists' : 'missing'}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!paystackReady && !error && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Loading payment system... Please wait a moment before proceeding.
              </AlertDescription>
            </Alert>
          )}

          {!paystackReady && !error && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-sm text-muted-foreground">
                Initializing payment system...
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This may take a few seconds on first load
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handlePayment}
              disabled={loading || !paystackReady}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : !paystackReady ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay {formatPrice(amount)}
                </>
              )}
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>

          {/* Security Notice */}
          <div className="text-xs text-gray-500 text-center">
            🔒 Your payment is secured by Paystack. We never store your card details.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaystackPayment;
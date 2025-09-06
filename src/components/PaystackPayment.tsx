import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, CheckCircle, XCircle, ExternalLink, RefreshCw, RotateCcw, Sparkles, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
// import { verifyPaystackPayment, simplePaymentVerification } from '@/utils/paystackVerification';

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
      
      // Get Supabase session for authorization
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Failed to get session:', sessionError);
        setError('Authentication required. Please log in again.');
        toast.error('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Verify payment via Supabase Edge Function
      const verifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`;
      
      const requestBody = {
        reference: response.reference,
        plan: plan,
        amount: amount,
        email: user?.email
      };
      
      console.log('Sending payment verification request:', {
        url: verifyUrl,
        body: requestBody,
        hasAuthToken: !!session.access_token
      });
      
      const subscriptionResponse = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!subscriptionResponse.ok) {
        let error;
        try {
          const errorText = await subscriptionResponse.text();
          if (errorText) {
            error = JSON.parse(errorText);
          } else {
            error = { message: 'Empty response from server' };
          }
        } catch (parseError) {
          error = { message: 'Failed to parse server response' };
        }
        
        console.error('Payment verification failed:', {
          status: subscriptionResponse.status,
          statusText: subscriptionResponse.statusText,
          error: error
        });
        
        // Show specific error message
        const errorMessage = error.details || error.message || 'Failed to create subscription';
        throw new Error(`Payment verification failed: ${errorMessage}`);
      }

      let result;
      try {
        const responseText = await subscriptionResponse.text();
        if (!responseText) {
          throw new Error('Empty response from server');
        }
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Failed to parse server response');
      }

      if (result.success) {
        console.log('Payment verification successful:', result);
        toast.success(`🎉 Welcome to ${planName}! Your subscription has been activated.`);
        onSuccess({ reference: response.reference, plan });
      } else {
        console.error('Payment verification failed - success=false:', result);
        throw new Error(result.message || 'Failed to update subscription');
      }
    } catch (err) {
      console.error('Payment verification error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment verification failed';
      setError(errorMessage);
      
      // Show more specific error message
      if (errorMessage.includes('Authentication required')) {
        toast.error('Please log in again to complete your payment.');
      } else if (errorMessage.includes('Amount mismatch')) {
        toast.error('Payment amount verification failed. Please try again.');
      } else if (errorMessage.includes('Payment verification failed')) {
        toast.error('Payment verification failed. Please check your payment and try again.');
      } else {
        toast.error(`Payment verification failed: ${errorMessage}`);
      }
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
      if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY === 'pk_test_...' || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY.includes('your_actual_paystack')) {
        throw new Error('Paystack public key not configured. Please add your actual Paystack key to the .env.local file. See PAYSTACK_KEY_FIX.md for instructions.');
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
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Upgrade to {planName}
              </CardTitle>
              <CardDescription className="text-gray-600">
                Complete your payment to activate your {planName} subscription
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Summary */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Plan:</span>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">{currentPlanDetails.name}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Duration:</span>
                  <span className="text-sm text-gray-600">{currentPlanDetails.duration}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Price:</span>
                  <span className="text-xl font-bold text-gray-900">{formatPrice(amount)}/month</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Features:</span>
                  <span className="text-sm text-gray-600">{currentPlanDetails.features.length} features</span>
                </div>
              </div>
            </div>
          </div>

          {/* Plan Benefits */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Plan Benefits
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentPlanDetails.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                
                {/* Special handling for Paystack key configuration errors */}
                {error.includes('Paystack public key not configured') && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">🔑 Configuration Required</h4>
                    <p className="text-sm text-red-700 mb-3">
                      To fix this issue, you need to configure your Paystack public key:
                    </p>
                    <ol className="text-sm text-red-700 space-y-1 mb-3">
                      <li>1. Get your Paystack key from <a href="https://dashboard.paystack.com/settings/developers" target="_blank" rel="noopener noreferrer" className="underline">Paystack Dashboard</a></li>
                      <li>2. Update the <code className="bg-red-100 px-1 rounded">VITE_PAYSTACK_PUBLIC_KEY</code> in your <code className="bg-red-100 px-1 rounded">.env.local</code> file</li>
                      <li>3. Restart your development server</li>
                    </ol>
                    <div className="text-xs text-red-600">
                      <strong>Current key:</strong> {import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'Not set'}
                    </div>
                  </div>
                )}
                
                <div className="mt-2 space-y-2">
                  {/* Network Status */}
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${navigator.onLine ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span>{navigator.onLine ? 'Online' : 'Offline'}</span>
                  </div>
                  
                  {/* Retry Button for Payment Verification Errors */}
                  {(error.includes('Payment verification failed') || error.includes('Failed to create subscription') || error.includes('Failed to update subscription')) && (
                    <Button 
                      onClick={() => {
                        setError(null);
                        setLoading(false);
                      }} 
                      size="sm" 
                      variant="outline"
                      className="w-full"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry Payment Verification
                    </Button>
                  )}
                  
                  {/* General Retry */}
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
                    <p>Debug: Paystack Key = {import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ? 'Set' : 'Not set'}</p>
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
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handlePayment}
              disabled={loading || !paystackReady}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-3 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : !paystackReady ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pay {formatPrice(amount)}
                </>
              )}
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              disabled={loading}
              className="px-8 py-3 rounded-lg font-medium border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </Button>
          </div>

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-lg border border-green-200">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium">
              Your payment is secured by Paystack. We never store your card details.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaystackPayment;